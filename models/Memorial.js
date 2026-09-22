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
    type: [String],
    default: [],
  },
  guestbookEntries: [guestbookEntrySchema],
});

memorialSchema.index({ createdBy: 1 });

module.exports = mongoose.model("Memorial", memorialSchema);
