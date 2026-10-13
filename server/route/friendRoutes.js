// server/route/friendRoutes.js

const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");

const {
  searchUsers,
  sendFriendRequest,
  getFriendRequests,
  respondToFriendRequest,
  getFriends,
  cancelFriendRequest,
  removeFriend,
} = require("../controller/friendController");

// All routes below require a logged-in user.
router.use(protect);

// Search users by username.
router.get("/search", searchUsers);

// Friend requests.
router.get("/requests", getFriendRequests);
router.post("/request/:userId", sendFriendRequest);
router.patch("/request/:requestId/respond", respondToFriendRequest);
router.delete("/request/:requestId", cancelFriendRequest);

// Friends list and removal.
router.get("/", getFriends);
router.delete("/:userId", removeFriend);

module.exports = router;