// Recovery for a locked-out superadmin: npm run reset-link -- you@example.com
const config = require("../config");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");

async function main() {
  const email = (process.argv[2] || "").trim().toLowerCase();
  if (!email) {
    throw new Error("Usage: npm run reset-link -- you@example.com");
  }

  await connectDB();
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error(`No account found for ${email}`);
  }

  const token = await user.createPasswordResetToken();
  const baseUrl = config.baseUrl || `http://localhost:${config.port}`;
  console.log(`${baseUrl}/reset-password/${token}`);
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
