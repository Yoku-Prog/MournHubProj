const config = require("./config");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const app = require("./app");
const User = require("./models/User");

// Connect to MongoDB and start server
connectDB()
  .then(() => {
    console.log("MongoDB connected");
    return config.isProduction ? User.exists({ role: "superadmin" }) : true;
  })
  .then((hasSuperAdmin) => {
    if (!hasSuperAdmin) {
      console.warn(
        'No superadmin yet. Create one with: npm run create-superadmin -- you@example.com "Your Name"',
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
