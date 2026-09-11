const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { redirectIfAuth } = require("../middleware/authMiddleware");

router.get("/register", redirectIfAuth, authController.getRegister);
router.post("/register", redirectIfAuth, authController.postRegister);

router.get("/login", redirectIfAuth, authController.getLogin);
router.post("/login", redirectIfAuth, authController.postLogin);

router.get("/logout", authController.logout);

module.exports = router;
