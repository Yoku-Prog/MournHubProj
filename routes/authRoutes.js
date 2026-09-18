const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { redirectIfAuth, requireAuth, requireSuperAdmin } = require('../middleware/authMiddleware');

router.get('/register', redirectIfAuth, authController.getRegister);
router.post('/register', redirectIfAuth, authController.postRegister);

router.get('/login', redirectIfAuth, authController.getLogin);
router.post('/login', redirectIfAuth, authController.postLogin);

router.get('/logout', authController.logout);

router.get('/admins/pending', requireAuth, requireSuperAdmin, authController.listPendingAdmins);
router.post('/admins/:id/approve', requireAuth, requireSuperAdmin, authController.approveAdmin);
router.post('/admins/:id/reject', requireAuth, requireSuperAdmin, authController.rejectAdmin);

module.exports = router;