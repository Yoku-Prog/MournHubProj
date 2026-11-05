const express = require("express");
const router = express.Router();
const memorialController = require("../controllers/memorialController");
const { requireAuth } = require("../middleware/authMiddleware");
const { verifyCsrf } = require("../middleware/csrf");

router.get("/dashboard", requireAuth, memorialController.listMemorials);

router.get("/memorials/new", requireAuth, memorialController.getCreateForm);
router.post(
  "/memorials/new",
  requireAuth,
  memorialController.uploadPhoto,
  memorialController.handleUploadErrors,
  verifyCsrf,
  memorialController.createMemorial,
);
router.get("/memorials/:id/edit", requireAuth, memorialController.getEditForm);
router.post(
  "/memorials/:id/edit",
  requireAuth,
  memorialController.uploadPhoto,
  memorialController.handleUploadErrors,
  verifyCsrf,
  memorialController.updateMemorial,
);
router.get("/memorials/:id/qr.png", requireAuth, memorialController.getQrCode);

router.post(
  "/memorials/:id/toggle-publish",
  requireAuth,
  verifyCsrf,
  memorialController.togglePublish,
);
router.post(
  "/memorials/:id/delete",
  requireAuth,
  verifyCsrf,
  memorialController.deleteMemorial,
);

router.post(
  "/memorials/:id/photos/:photoId/delete",
  requireAuth,
  verifyCsrf,
  memorialController.deleteGalleryPhoto,
);
router.post(
  "/memorials/:id/photos/:photoId/caption",
  requireAuth,
  verifyCsrf,
  memorialController.updatePhotoCaption,
);

router.post(
  "/memorials/:id/guestbook/:entryId/delete",
  requireAuth,
  verifyCsrf,
  memorialController.deleteGuestbookEntry,
);

module.exports = router;
