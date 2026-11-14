const bcrypt = require("bcrypt");
const User = require("../models/User");
const Memorial = require("../models/Memorial");
const config = require("../config");
const { renderError } = require("../middleware/errorHandlers");

const MIN_PASSWORD_LENGTH = 8;
// bcrypt only reads the first 72 bytes, so a longer password adds nothing
const MAX_PASSWORD_LENGTH = 72;
const MAX_NAME_LENGTH = 80;
const MAX_EMAIL_LENGTH = 254;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Compared against when an email isn't found, so a missing account takes as
// long to reject as a wrong password and response times don't reveal which
// addresses have accounts.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("not-a-real-password", 10);

const isString = (value) => typeof value === "string";

// Fresh session ID on login so a pre-login session can't be reused (session fixation)
function startSession(req, user) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.userId = user._id;
      req.session.userName = user.name;
      req.session.userRole = user.role;
      req.session.sessionVersion = user.sessionVersion || 0;
      resolve();
    });
  });
}

// Outside production, the superadmin is whoever registers with SUPERADMIN_EMAIL,
// or the first account without it. Production never grants it here: the
// address isn't verified, so whoever registered with it first would win.
// There it comes from `npm run create-superadmin` on the server.
async function shouldBecomeSuperAdmin(email) {
  if (config.isProduction) return false;
  const superAdminEmail = process.env.SUPERADMIN_EMAIL;
  if (superAdminEmail) {
    if (email !== superAdminEmail.trim().toLowerCase()) return false;
    return !(await User.exists({ role: "superadmin" }));
  }
  return (await User.countDocuments()) === 0;
}

function passwordError(password, confirmPassword) {
  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (Buffer.byteLength(password) > MAX_PASSWORD_LENGTH) {
    return `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.`;
  }
  return null;
}

// Show register page
exports.getRegister = (req, res) => {
  res.render("register", { error: null });
};

// Handle registration
exports.postRegister = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (
      ![name, email, password, confirmPassword].every(isString) ||
      !name.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      return res
        .status(400)
        .render("register", { error: "All fields are required." });
    }

    if (name.trim().length > MAX_NAME_LENGTH) {
      return res.status(400).render("register", {
        error: `Name must be ${MAX_NAME_LENGTH} characters or fewer.`,
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (
      normalizedEmail.length > MAX_EMAIL_LENGTH ||
      !EMAIL_PATTERN.test(normalizedEmail)
    ) {
      return res
        .status(400)
        .render("register", { error: "Please enter a valid email address." });
    }

    const invalidPassword = passwordError(password, confirmPassword);
    if (invalidPassword) {
      return res.status(400).render("register", { error: invalidPassword });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).render("register", {
        error: "Unable to register with these details.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const isSuperAdmin = await shouldBecomeSuperAdmin(normalizedEmail);

    const newUser = new User({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      isApproved: isSuperAdmin,
      role: isSuperAdmin ? "superadmin" : "admin",
    });

    await newUser.save();

    if (isSuperAdmin) {
      await startSession(req, newUser);
      return res.redirect("/dashboard");
    }

    res.render("login", {
      error: null,
      notice:
        "Account created. An administrator must approve your account before you can log in.",
    });
  } catch (err) {
    // Two registrations for one email at the same moment: the unique index
    // rejects the second, which gets the same answer as any taken address.
    if (err.code === 11000) {
      return res.status(400).render("register", {
        error: "Unable to register with these details.",
      });
    }
    console.error(err);
    res.status(500).render("register", {
      error: "Something went wrong. Please try again.",
    });
  }
};

// Show login page
exports.getLogin = (req, res) => {
  res.render("login", { error: null, notice: null });
};

// Handle login
exports.postLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!isString(email) || !isString(password) || !email || !password) {
      return res.status(400).render("login", {
        error: "All fields are required.",
        notice: null,
      });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    const isMatch = await bcrypt.compare(
      password,
      user ? user.password : DUMMY_PASSWORD_HASH,
    );
    if (!user || !isMatch) {
      return res.status(401).render("login", {
        error: "Invalid email or password.",
        notice: null,
      });
    }

    if (!user.isApproved) {
      return res.status(403).render("login", {
        error: "Your account isn't approved. Please contact your administrator.",
        notice: null,
      });
    }

    await startSession(req, user);

    res.redirect("/dashboard");
  } catch (err) {
    console.error(err);
    res.status(500).render("login", {
      error: "Something went wrong. Please try again.",
      notice: null,
    });
  }
};

// Handle logout
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error(err);
    res.redirect("/login");
  });
};

function findUserByResetToken(token) {
  return User.findOne({
    passwordResetTokenHash: User.hashResetToken(token),
    passwordResetExpires: { $gt: new Date() },
  });
}

function renderInvalidResetLink(res) {
  renderError(
    res,
    400,
    "This link is no longer valid",
    "Password reset links expire after 24 hours and can only be used once. Please ask your administrator for a new one.",
  );
}

// Show the choose-a-new-password page
exports.getResetPassword = async (req, res) => {
  const user = await findUserByResetToken(req.params.token);
  if (!user) {
    return renderInvalidResetLink(res);
  }
  res.render("reset-password", { token: req.params.token, error: null });
};

// Handle a new password from a reset link
exports.postResetPassword = async (req, res) => {
  const user = await findUserByResetToken(req.params.token);
  if (!user) {
    return renderInvalidResetLink(res);
  }

  const { password, confirmPassword } = req.body;
  const invalidPassword =
    isString(password) && isString(confirmPassword) && password
    ? passwordError(password, confirmPassword)
    : "All fields are required.";
  if (invalidPassword) {
    return res.status(400).render("reset-password", {
      token: req.params.token,
      error: invalidPassword,
    });
  }

  user.password = await bcrypt.hash(password, 10);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpires = undefined;
  user.sessionVersion = (user.sessionVersion || 0) + 1;
  await user.save();

  res.render("login", {
    error: null,
    notice: "Your password has been updated. You can log in now.",
  });
};

async function renderAdmins(req, res, options = {}) {
  const users = await User.find()
    .select("name email role isApproved createdAt")
    .sort({ createdAt: -1 })
    .lean();

  res.status(options.status || 200).render("admins", {
    pendingAdmins: users.filter((user) => !user.isApproved),
    approvedAdmins: users.filter((user) => user.isApproved),
    error: options.error || null,
    resetLink: options.resetLink || null,
    resetLinkFor: options.resetLinkFor || null,
  });
}

// List admins (superadmin only)
exports.listAdmins = async (req, res) => {
  await renderAdmins(req, res);
};

// Approve a pending or revoked admin
exports.approveAdmin = async (req, res) => {
  await User.updateOne(
    { _id: req.params.id, role: "admin" },
    { isApproved: true },
  );
  res.redirect("/admins");
};

// Reject (delete) a pending admin. An account that has memorials is kept so
// those memorials still have an owner; revoking it is enough to block access.
exports.rejectAdmin = async (req, res) => {
  if (await Memorial.exists({ createdBy: req.params.id })) {
    return renderAdmins(req, res, {
      status: 409,
      error: "This account has memorials, so it can't be deleted.",
    });
  }
  await User.deleteOne({
    _id: req.params.id,
    isApproved: false,
    role: "admin",
  });
  res.redirect("/admins");
};

// Block an approved admin and end their sessions
exports.revokeAdmin = async (req, res) => {
  await User.updateOne(
    { _id: req.params.id, role: "admin" },
    { isApproved: false, $inc: { sessionVersion: 1 } },
  );
  res.redirect("/admins");
};

// Create a one-time password reset link for the superadmin to pass along
exports.createResetLink = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.redirect("/admins");
  }
  const token = await user.createPasswordResetToken();
  await renderAdmins(req, res, {
    resetLink: `${config.publicBaseUrl(req)}/reset-password/${token}`,
    resetLinkFor: user.name,
  });
};
