const renderError = (res, status, title, message) =>
  res.status(status).render("error", { title, message });

exports.renderError = renderError;

exports.notFound = (req, res) => {
  renderError(
    res,
    404,
    "Page not found",
    "We couldn't find the page you were looking for.",
  );
};

// Express identifies error handlers by their four arguments
exports.errorHandler = (err, req, res, next) => {
  console.error(err);
  if (res.headersSent) {
    return next(err);
  }
  renderError(
    res,
    err.status || 500,
    "Something went wrong",
    "Please try again in a moment.",
  );
};
