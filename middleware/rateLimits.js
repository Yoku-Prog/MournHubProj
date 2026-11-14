const { rateLimit } = require("express-rate-limit");

const MINUTE = 60 * 1000;

const limiter = (options, handler) =>
  rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    handler,
    ...options,
  });

const jsonHandler = (message) => (req, res) =>
  res.status(429).json({ error: message });

// Only failed attempts count: failed logins respond with 4xx
exports.loginLimiter = limiter(
  { windowMs: 15 * MINUTE, limit: 10, skipSuccessfulRequests: true },
  (req, res) =>
    res.status(429).render("login", {
      notice: null,
      error: "Too many failed attempts. Please wait 15 minutes and try again.",
    }),
);

exports.registerLimiter = limiter(
  { windowMs: 60 * MINUTE, limit: 10 },
  (req, res) =>
    res.status(429).render("register", {
      error: "Too many registration attempts. Please try again later.",
    }),
);

exports.resetPasswordLimiter = limiter(
  { windowMs: 15 * MINUTE, limit: 10 },
  (req, res) =>
    res.status(429).render("error", {
      title: "Too many attempts",
      message: "Please wait 15 minutes and try again.",
    }),
);

exports.guestbookLimiter = limiter(
  { windowMs: 10 * MINUTE, limit: 5 },
  jsonHandler(
    "You've left several messages. Please try again in a few minutes.",
  ),
);

// Generous, because families visiting together can share one IP address
exports.candleLimiter = limiter(
  { windowMs: 60 * MINUTE, limit: 30 },
  jsonHandler("Please try again later."),
);
