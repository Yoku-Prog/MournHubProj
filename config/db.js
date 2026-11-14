const mongoose = require("mongoose");
const config = require("./index");

module.exports = function connectDB() {
  return mongoose.connect(config.mongoUri, {
    serverSelectionTimeoutMS: 8000,
    family: 4,
    minPoolSize: 0,
  });
};
