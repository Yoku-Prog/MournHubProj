const User = require("../models/User");

// Protect routes that require login. Checks the account on every request so
// revoking access or resetting a password ends existing sessions immediately.
exports.requireAuth = async (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }

  const user = await User.findById(req.session.userId)
    .select("name role isApproved sessionVersion")
    .lean();

  const isValid =
    user &&
    user.isApproved &&
    (user.sessionVersion || 0) === (req.session.sessionVersion || 0);

  if (!isValid) {
    return req.session.destroy(() => res.redirect("/login"));
  }

  req.session.userName = user.name;
  req.session.userRole = user.role;
  next();
};

// Redirect logged-in users away from login/register pages
exports.redirectIfAuth = (req, res, next) => {
  if (req.session.userId) {
    return res.redirect("/dashboard");
  }
  next();
};

// Restrict access to the superadmin only
exports.requireSuperAdmin = (req, res, next) => {
  if (req.session.userRole !== "superadmin") {
    return res.status(403).render("error", {
      title: "Access denied",
      message: "This page is only available to the superadmin.",
    });
  }
  next();
};
