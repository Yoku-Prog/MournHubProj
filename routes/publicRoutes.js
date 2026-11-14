const express = require("express");
const router = express.Router();
const publicController = require("../controllers/publicController");
const { candleLimiter, guestbookLimiter } = require("../middleware/rateLimits");

// Visitors post these without logging in, so there's no CSRF token. Requiring
// JSON is the protection instead: another site's form can't send it, and its
// scripts can't send it to us without a CORS preflight we never approve.
const requireJson = (req, res, next) => {
  if (!req.is("application/json")) {
    return res.status(415).json({ error: "Please try again from the memorial page." });
  }
  next();
};

router.get("/", publicController.viewLanding);
router.get("/memorial/:slug", publicController.viewPublicMemorial);
router.get("/memorial/:slug/gallery", publicController.viewGallery);
router.get("/memorial/:slug/photos/:photoId", publicController.viewPhoto);
router.post(
  "/memorial/:slug/light-candle",
  candleLimiter,
  requireJson,
  publicController.lightCandle,
);
router.post(
  "/memorial/:slug/guestbook",
  guestbookLimiter,
  requireJson,
  publicController.addGuestbookEntry,
);

module.exports = router;
