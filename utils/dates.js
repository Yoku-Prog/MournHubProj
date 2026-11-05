// Birth and death dates are stored as UTC midnight, so they must also be read
// in UTC or they can show the previous day on servers behind UTC.
exports.formatDate = (date) =>
  new Date(date).toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

// Value for <input type="date">. Re-rendered forms hold the submitted string.
exports.formatDateInput = (date) => {
  if (!date) return "";
  return typeof date === "string" ? date : date.toISOString().split("T")[0];
};
