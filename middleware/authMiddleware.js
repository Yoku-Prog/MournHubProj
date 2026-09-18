// Protect routes that require login
exports.requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
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
    return res.status(403).send("Access denied. Superadmin only.");
  }
  next();
};
