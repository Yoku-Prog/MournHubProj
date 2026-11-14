const mongoose = require("mongoose");
const config = require("./index");

// One shared attempt, however many requests ask at once. A failed attempt is
// forgotten so the next request can try again.
let connecting = null;

module.exports = function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return Promise.resolve(mongoose);
  }
  if (!connecting) {
    connecting = mongoose
      .connect(config.mongoUri, {
        serverSelectionTimeoutMS: 8000,
        family: 4,
        minPoolSize: 0,
      })
      .finally(() => {
        connecting = null;
      });
  }
  return connecting;
};
