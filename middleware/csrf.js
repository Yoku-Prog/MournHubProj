const crypto = require("crypto");
const { renderError } = require("./errorHandlers");

// Views call csrfToken() in their forms. It's lazy so that only pages with a
// form create a session for anonymous visitors.
exports.exposeCsrfToken = (req, res, next) => {
  res.locals.csrfToken = () => {
    if (!req.session.csrfToken) {
      req.session.csrfToken = crypto.randomBytes(32).toString("hex");
    }
    return req.session.csrfToken;
  };
  next();
};

// Runs per route rather than globally: multipart forms only have a parsed
// body after multer has run.
exports.verifyCsrf = (req, res, next) => {
  const expected = req.session.csrfToken;
  const submitted = req.body && req.body._csrf;

  const isValid =
    typeof expected === "string" &&
    typeof submitted === "string" &&
    expected.length === submitted.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(submitted));

  if (!isValid) {
    return renderError(
      res,
      403,
      "This page has expired",
      "Please go back, refresh the page, and try again.",
    );
  }
  next();
};
