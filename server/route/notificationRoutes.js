const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  respondToNotification,
} = require("../controller/notificationController");

router.use(protect);
router.get("/", getNotifications);
router.patch("/read-all", markAllNotificationsRead);
router.patch("/:notificationId/read", markNotificationRead);
router.patch("/:notificationId/respond", respondToNotification);
router.delete("/:notificationId", deleteNotification);

module.exports = router;
