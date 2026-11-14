// Creates the superadmin: npm run create-superadmin -- you@example.com "Your Name"
//
// In production the register page never makes a superadmin, because anyone who
// guessed the address could claim it first. Run this on the server instead; it
// prints a one-time link for choosing the password.
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const config = require("../config");
const User = require("../models/User");

async function createSuperAdmin(email, name) {
  const normalizedEmail = (email || "").trim().toLowerCase();
  const trimmedName = (name || "").trim();
  if (!normalizedEmail || !trimmedName) {
    throw new Error('Usage: npm run create-superadmin -- you@example.com "Your Name"');
  }
  if (await User.exists({ role: "superadmin" })) {
    throw new Error(
      "A superadmin already exists. To get back in, use: npm run reset-link -- <email>",
    );
  }
  if (await User.exists({ email: normalizedEmail })) {
    throw new Error(`An account already uses ${normalizedEmail}.`);
  }

  // Nobody knows this password; the reset link sets the real one
  const user = await User.create({
    name: trimmedName,
    email: normalizedEmail,
    password: await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10),
    role: "superadmin",
    isApproved: true,
  });
  return user.createPasswordResetToken();
}

module.exports = { createSuperAdmin };

if (require.main === module) {
  const mongoose = require("mongoose");
  const connectDB = require("../config/db");
  connectDB()
    .then(() => createSuperAdmin(process.argv[2], process.argv[3]))
    .then((token) => {
      const baseUrl = config.baseUrl || `http://localhost:${config.port}`;
      console.log("Superadmin created. Choose a password within 24 hours at:");
      console.log(`${baseUrl}/reset-password/${token}`);
    })
    .catch((err) => {
      console.error(err.message);
      process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
}
