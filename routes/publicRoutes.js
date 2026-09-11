const express = require("express");
const router = express.Router();
const publicController = require("../controllers/publicController");
router.get("/memorial/:slug", publicController.viewPublicMemorial);
module.exports = router;
