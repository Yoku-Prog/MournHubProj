const express = require("express");
const router = express.Router();
const memorialController = require("../controllers/memorialController");
const { requireAuth } = require("../middleware/authMiddleware");

const handleUploadErrors = (err, req, res, next) => {
  if (err) {
    return res.render("memorial-form", {
      memorial: req.body,
      error:
        err.code === "LIMIT_FILE_SIZE"
          ? "One of your photos is too large. Please use images under 10MB each."
          : "There was a problem uploading your photos: " + err.message,
    });
  }
  next();
};

router.get("/dashboard", requireAuth, memorialController.listMemorials);

router.get("/memorials/new", requireAuth, memorialController.getCreateForm);
router.post(
  "/memorials/new",
  requireAuth,
  memorialController.uploadPhoto,
  handleUploadErrors,
  memorialController.createMemorial,
);
router.get("/memorials/:id/edit", requireAuth, memorialController.getEditForm);
router.post(
  "/memorials/:id/edit",
  requireAuth,
  memorialController.uploadPhoto,
  handleUploadErrors,
  memorialController.updateMemorial,
);

router.post(
  "/memorials/:id/toggle-publish",
  requireAuth,
  memorialController.togglePublish,
);
router.post(
  "/memorials/:id/delete",
  requireAuth,
  memorialController.deleteMemorial,
);

router.post(
  "/memorials/:id/photos/:photoId/delete",
  requireAuth,
  memorialController.deleteGalleryPhoto,
);
router.post(
  "/memorials/:id/photos/:photoId/caption",
  requireAuth,
  memorialController.updatePhotoCaption,
);

router.post(
  "/memorials/:id/guestbook/:entryId/delete",
  requireAuth,
  memorialController.deleteGuestbookEntry,
);

module.exports = router;
