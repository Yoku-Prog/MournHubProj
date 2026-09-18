const bcrypt = require("bcrypt");
const User = require("../models/User");

// Show register page
exports.getRegister = (req, res) => {
  res.render("register", { error: null });
};

// Handle registration
exports.postRegister = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      return res.render("register", { error: "All fields are required." });
    }

    if (password !== confirmPassword) {
      return res.render("register", { error: "Passwords do not match." });
    }

    if (password.length < 6) {
      return res.render("register", {
        error: "Password must be at least 6 characters.",
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.render("register", {
        error: "Unable to register with these details.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const adminCount = await User.countDocuments();
    const isFirstAccount = adminCount === 0;

    const newUser = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      isApproved: isFirstAccount,
      role: isFirstAccount ? "superadmin" : "admin",
    });

    await newUser.save();

    if (isFirstAccount) {
      req.session.userId = newUser._id;
      req.session.userName = newUser.name;
      req.session.userRole = newUser.role;
      return res.redirect("/dashboard");
    }

    res.render("login", {
      error: null,
      notice:
        "Account created. The superadmin must approve your account before you can log in.",
    });
  } catch (err) {
    console.error(err);
    res.render("register", {
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

    if (!email || !password) {
      return res.render("login", {
        error: "All fields are required.",
        notice: null,
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.render("login", {
        error: "Invalid email or password.",
        notice: null,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render("login", {
        error: "Invalid email or password.",
        notice: null,
      });
    }

    if (!user.isApproved) {
      return res.render("login", {
        error: "Your account is pending approval from the superadmin.",
        notice: null,
      });
    }

    req.session.userId = user._id;
    req.session.userName = user.name;
    req.session.userRole = user.role;

    res.redirect("/dashboard");
  } catch (err) {
    console.error(err);
    res.render("login", {
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

// List admins awaiting approval (superadmin only)
exports.listPendingAdmins = async (req, res) => {
  try {
    const pendingAdmins = await User.find({ isApproved: false }).sort({
      createdAt: -1,
    });
    res.render("pending-admins", {
      pendingAdmins,
      userName: req.session.userName,
    });
  } catch (err) {
    console.error(err);
    res.redirect("/dashboard");
  }
};

// Approve a specific pending admin
exports.approveAdmin = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isApproved: true });
    res.redirect("/admins/pending");
  } catch (err) {
    console.error(err);
    res.redirect("/admins/pending");
  }
};

// Reject (delete) a pending admin
exports.rejectAdmin = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.redirect("/admins/pending");
  } catch (err) {
    console.error(err);
    res.redirect("/admins/pending");
  }
};
