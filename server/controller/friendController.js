// server/controller/friendController.js

const mongoose = require("mongoose");
const User = require("../model/User");
const Friendship = require("../model/Friendship");

// Escape special characters before using a username in a regex.
const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");


const notifyUser = (req, userId, event, payload) => {
  const io = req.app.get("io");

  if (io && userId) {
    io.to(`user:${String(userId)}`).emit(event, payload);
  }
};

// GET /api/friends/search?username=adi
const searchUsers = async (req, res) => {
  try {
    const username = String(req.query.username || "")
      .trim()
      .toLowerCase();

    if (username.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Enter at least 2 characters to search.",
      });
    }

    const users = await User.find({
      _id: { $ne: req.user._id },
      username: { $regex: escapeRegex(username) },
    })
      .select("_id name username")
      .limit(20)
      .lean();

    const userIds = users.map((user) => user._id);

    const relationships = userIds.length
      ? await Friendship.find({
          $or: [
            { requester: req.user._id, recipient: { $in: userIds } },
            { recipient: req.user._id, requester: { $in: userIds } },
          ],
        }).lean()
      : [];

    const relationshipMap = new Map();

    for (const relationship of relationships) {
      const otherUserId =
        String(relationship.requester) === String(req.user._id)
          ? String(relationship.recipient)
          : String(relationship.requester);

      const isOutgoing =
        String(relationship.requester) === String(req.user._id);

      // Accepted friendships take priority over old rejected records.
      const previous = relationshipMap.get(otherUserId);

      if (
        !previous ||
        relationship.status === "accepted" ||
        (relationship.status === "pending" && previous.status === "rejected")
      ) {
        relationshipMap.set(otherUserId, {
          status: relationship.status,
          direction: isOutgoing ? "outgoing" : "incoming",
        });
      }
    }

    return res.status(200).json({
      success: true,
      users: users.map((user) => ({
        ...user,
        friendship: relationshipMap.get(String(user._id)) || {
          status: "none",
          direction: null,
        },
      })),
    });
  } catch (error) {
    console.error("Search users error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to search users.",
    });
  }
};

// POST /api/friends/request/:userId
const sendFriendRequest = async (req, res) => {
  try {
    const requesterId = req.user._id;
    const recipientId = req.params.userId;

    if (!mongoose.isValidObjectId(recipientId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    if (String(requesterId) === String(recipientId)) {
      return res.status(400).json({
        success: false,
        message: "You cannot send a friend request to yourself.",
      });
    }

    const recipient = await User.findById(recipientId).select("_id");

    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const existing = await Friendship.findOne({
      $or: [
        { requester: requesterId, recipient: recipientId },
        { requester: recipientId, recipient: requesterId },
      ],
    });

    if (existing?.status === "accepted") {
      return res.status(409).json({
        success: false,
        message: "You are already friends.",
      });
    }

    // If the other user has already requested you, accept that request.
    if (
      existing?.status === "pending" &&
      String(existing.requester) === String(recipientId)
    ) {
      existing.status = "accepted";
      existing.respondedAt = new Date();
      await existing.save();

      notifyUser(req, existing.requester, "friend-request-accepted", {
  requestId: String(existing._id),
  user: {
    _id: String(req.user._id),
    name: req.user.name,
    username: req.user.username,
  },
});

      return res.status(200).json({
        success: true,
        message: "Friend request accepted. You are now friends!",
        friendship: existing,
      });
    }

    if (existing?.status === "pending") {
      return res.status(409).json({
        success: false,
        message: "Friend request already sent.",
      });
    }

    // Reuse a rejected record in either direction instead of creating
    // duplicate records for the same pair.
    if (existing) {
      existing.requester = requesterId;
      existing.recipient = recipientId;
      existing.status = "pending";
      existing.respondedAt = null;
      await existing.save();

      return res.status(201).json({
        success: true,
        message: "Friend request sent successfully.",
        friendship: existing,
      });
    }

    const friendship = await Friendship.create({
      requester: requesterId,
      recipient: recipientId,
      status: "pending",
    });

    notifyUser(req, recipientId, "friend-request-received", {
  requestId: String(friendship._id),
  requester: {
    _id: String(req.user._id),
    name: req.user.name,
    username: req.user.username,
  },
  createdAt: friendship.createdAt,
});

    return res.status(201).json({
      success: true,
      message: "Friend request sent successfully.",
      friendship,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A friend request already exists for these users.",
      });
    }

    console.error("Send friend request error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to send friend request.",
    });
  }
};

// GET /api/friends/requests
const getFriendRequests = async (req, res) => {
  try {
    const [incoming, outgoing] = await Promise.all([
      Friendship.find({
        recipient: req.user._id,
        status: "pending",
      })
        .populate("requester", "name username")
        .sort({ createdAt: -1 })
        .lean(),

      Friendship.find({
        requester: req.user._id,
        status: "pending",
      })
        .populate("recipient", "name username")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      incoming,
      outgoing,
    });
  } catch (error) {
    console.error("Get friend requests error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load friend requests.",
    });
  }
};

// PATCH /api/friends/request/:requestId/respond
const respondToFriendRequest = async (req, res) => {
  try {
    const { action } = req.body;

    if (!["accept", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be either "accept" or "reject".',
      });
    }

    if (!mongoose.isValidObjectId(req.params.requestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid friend request ID.",
      });
    }

    const friendship = await Friendship.findOne({
      _id: req.params.requestId,
      recipient: req.user._id,
      status: "pending",
    });

    if (!friendship) {
      return res.status(404).json({
        success: false,
        message: "Pending friend request not found.",
      });
    }

    friendship.status = action === "accept" ? "accepted" : "rejected";
    friendship.respondedAt = new Date();

    await friendship.save();

    const responseEvent =
  action === "accept"
    ? "friend-request-accepted"
    : "friend-request-rejected";

notifyUser(req, friendship.requester, responseEvent, {
  requestId: String(friendship._id),
  user: {
    _id: String(req.user._id),
    name: req.user.name,
    username: req.user.username,
  },
});

    return res.status(200).json({
      success: true,
      message:
        action === "accept"
          ? "Friend request accepted."
          : "Friend request rejected.",
      friendship,
    });
  } catch (error) {
    console.error("Respond to friend request error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to respond to friend request.",
    });
  }
};

// GET /api/friends
const getFriends = async (req, res) => {
  try {
    const friendships = await Friendship.find({
      status: "accepted",
      $or: [
        { requester: req.user._id },
        { recipient: req.user._id },
      ],
    })
      .populate("requester", "name username")
      .populate("recipient", "name username")
      .sort({ updatedAt: -1 })
      .lean();

    const friends = friendships.map((friendship) => {
      const isRequester =
        String(friendship.requester._id) === String(req.user._id);

      return isRequester
        ? friendship.recipient
        : friendship.requester;
    });

    return res.status(200).json({
      success: true,
      count: friends.length,
      friends,
    });
  } catch (error) {
    console.error("Get friends error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load friends.",
    });
  }
};

// DELETE /api/friends/request/:requestId
// Only the sender can cancel their own pending request.
const cancelFriendRequest = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.requestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid friend request ID.",
      });
    }

    const friendship = await Friendship.findOneAndDelete({
      _id: req.params.requestId,
      requester: req.user._id,
      status: "pending",
    });

    if (!friendship) {
      return res.status(404).json({
        success: false,
        message: "Your pending friend request was not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Friend request cancelled.",
    });
  } catch (error) {
    console.error("Cancel friend request error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to cancel friend request.",
    });
  }
};

// DELETE /api/friends/:userId
const removeFriend = async (req, res) => {
  try {
    const friendId = req.params.userId;

    if (!mongoose.isValidObjectId(friendId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    if (String(req.user._id) === String(friendId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid friend ID.",
      });
    }

    const friendship = await Friendship.findOneAndDelete({
      status: "accepted",
      $or: [
        { requester: req.user._id, recipient: friendId },
        { requester: friendId, recipient: req.user._id },
      ],
    });

    if (!friendship) {
      return res.status(404).json({
        success: false,
        message: "Friendship not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Friend removed successfully.",
    });
  } catch (error) {
    console.error("Remove friend error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to remove friend.",
    });
  }
};

module.exports = {
  searchUsers,
  sendFriendRequest,
  getFriendRequests,
  respondToFriendRequest,
  getFriends,
  cancelFriendRequest,
  removeFriend,
};