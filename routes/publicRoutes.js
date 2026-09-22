const express = require("express");
const router = express.Router();
const publicController = require("../controllers/publicController");

router.get("/memorial/:slug", publicController.viewPublicMemorial);
router.post("/memorial/:slug/light-candle", publicController.lightCandle);
router.post("/memorial/:slug/guestbook", publicController.addGuestbookEntry);

module.exports = router;