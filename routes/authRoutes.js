const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const authController = require('../controllers/authController');
const { redirectIfAuth, requireAuth, requireSuperAdmin } = require('../middleware/authMiddleware');
const { verifyCsrf } = require('../middleware/csrf');
const { loginLimiter, registerLimiter, resetPasswordLimiter } = require('../middleware/rateLimits');

// A malformed account id would otherwise fail inside the query as a server error
router.param('id', (req, res, next, id) => {
  if (!mongoose.isValidObjectId(id)) {
    return res.redirect('/admins');
  }
  next();
});

router.get('/register', redirectIfAuth, authController.getRegister);
router.post('/register', redirectIfAuth, registerLimiter, verifyCsrf, authController.postRegister);

router.get('/login', redirectIfAuth, authController.getLogin);
router.post('/login', redirectIfAuth, loginLimiter, verifyCsrf, authController.postLogin);

router.post('/logout', verifyCsrf, authController.logout);

router.get('/reset-password/:token', resetPasswordLimiter, authController.getResetPassword);
router.post('/reset-password/:token', resetPasswordLimiter, verifyCsrf, authController.postResetPassword);

router.get('/admins', requireAuth, requireSuperAdmin, authController.listAdmins);
router.post('/admins/:id/approve', requireAuth, requireSuperAdmin, verifyCsrf, authController.approveAdmin);
router.post('/admins/:id/reject', requireAuth, requireSuperAdmin, verifyCsrf, authController.rejectAdmin);
router.post('/admins/:id/revoke', requireAuth, requireSuperAdmin, verifyCsrf, authController.revokeAdmin);
router.post('/admins/:id/reset-link', requireAuth, requireSuperAdmin, verifyCsrf, authController.createResetLink);

module.exports = router;
