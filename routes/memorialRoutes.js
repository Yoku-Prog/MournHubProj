const express = require("express");
const router = express.Router();
const memorialController = require("../controllers/memorialController");
const { requireAuth } = require("../middleware/authMiddleware");

router.get("/dashboard", requireAuth, memorialController.listMemorials);

router.get("/memorials/new", requireAuth, memorialController.getCreateForm);
router.post(
  "/memorials/new",
  requireAuth,
  memorialController.uploadPhoto,
  memorialController.createMemorial,
);
router.get("/memorials/:id/edit", requireAuth, memorialController.getEditForm);
router.post(
  "/memorials/:id/edit",
  requireAuth,
  memorialController.uploadPhoto,
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
  "/memorials/:id/guestbook/:entryId/delete",
  requireAuth,
  memorialController.deleteGuestbookEntry,
);
module.exports = router;
