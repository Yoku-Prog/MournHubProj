const crypto = require("crypto");
const mongoose = require("mongoose");

const RESET_TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000;

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 80,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 254,
  },
  password: {
    type: String,
    required: true,
  },
  isApproved: {
    type: Boolean,
    default: false,
  },
  role: {
    type: String,
    enum: ["superadmin", "admin"],
    default: "admin",
  },
  // Incremented to invalidate every existing session for this account
  sessionVersion: {
    type: Number,
    default: 0,
  },
  passwordResetTokenHash: {
    type: String,
  },
  passwordResetExpires: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

userSchema.statics.hashResetToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

// Saves a hash of a new reset token and returns the token itself, which is
// never stored and can only be shown once.
userSchema.methods.createPasswordResetToken = async function () {
  const token = crypto.randomBytes(32).toString("hex");
  this.passwordResetTokenHash = this.constructor.hashResetToken(token);
  this.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_LIFETIME_MS);
  await this.save();
  return token;
};

module.exports = mongoose.model("User", userSchema);
