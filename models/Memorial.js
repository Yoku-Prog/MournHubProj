const mongoose = require("mongoose");

const guestbookEntrySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 60,
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const memorialSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  birthDate: {
    type: Date,
  },
  deathDate: {
    type: Date,
  },
  lifeStory: {
    type: String,
    required: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
  },
  isPublic: {
    type: Boolean,
    default: false,
  },
  // How long it stays online: chosen when it's first published. A memorial
  // with no end date is permanent.
  term: {
    type: String,
    enum: ["1y", "5y", "permanent"],
  },
  expiresAt: {
    type: Date,
    default: null,
  },
  // Every term bought for this memorial, for billing
  termPurchases: {
    type: [
      {
        term: { type: String, required: true },
        at: { type: Date, default: Date.now },
      },
    ],
    default: [],
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  photoUrl: {
    type: String,
    default: null,
  },
  candleCount: {
    type: Number,
    default: 0,
  },
  photos: {
    type: [
      {
        url: { type: String, required: true },
        caption: { type: String, default: "", trim: true, maxlength: 200 },
      },
    ],
    default: [],
  },
  guestbookEntries: [guestbookEntrySchema],
});

memorialSchema.index({ createdBy: 1 });

module.exports = mongoose.model("Memorial", memorialSchema);
