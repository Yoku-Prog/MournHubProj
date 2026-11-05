const express = require("express");
const router = express.Router();
const publicController = require("../controllers/publicController");
const { candleLimiter, guestbookLimiter } = require("../middleware/rateLimits");

router.get("/memorial/:slug", publicController.viewPublicMemorial);
router.get("/memorial/:slug/gallery", publicController.viewGallery);
router.post(
  "/memorial/:slug/light-candle",
  candleLimiter,
  publicController.lightCandle,
);
router.post(
  "/memorial/:slug/guestbook",
  guestbookLimiter,
  publicController.addGuestbookEntry,
);

module.exports = router;
