const config = require("./config");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const app = require("./app");

// Connect to MongoDB and start server
connectDB()
  .then(() => {
    console.log("MongoDB connected");
    if (config.isProduction && !process.env.SUPERADMIN_EMAIL) {
      console.warn(
        "SUPERADMIN_EMAIL is not set: new registrations can't become superadmin.",
      );
    }
    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });
mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error (non-fatal):", err.message);
});
