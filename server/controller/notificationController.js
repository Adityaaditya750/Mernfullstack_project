const mongoose = require("mongoose");
const Notification = require("../model/Notification");
const Room = require("../model/Room");
const Friendship = require("../model/Friendship");

const getNotifications = async (req, res) => {
  try {
    const filter = { recipient: req.user._id };
    if (req.query.unreadOnly === "true") filter.readAt = null;

    const notifications = await Notification.find(filter)
      .populate("actor", "name username")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.status(200).json({
      success: true,
      notifications,
      unreadCount: notifications.filter((item) => !item.readAt).length,
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load notifications.",
    });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.notificationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID.",
      });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.notificationId, recipient: req.user._id },
      { $set: { readAt: new Date() } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    return res.status(200).json({ success: true, notification });
  } catch (error) {
    console.error("Mark notification read error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to mark notification as read.",
    });
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, readAt: null },
      { $set: { readAt: new Date() } }
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read.",
    });
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to mark notifications as read.",
    });
  }
};

const deleteNotification = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.notificationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID.",
      });
    }

    const notification = await Notification.findOneAndDelete({
      _id: req.params.notificationId,
      recipient: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification deleted.",
    });
  } catch (error) {
    console.error("Delete notification error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to delete notification.",
    });
  }
};

const respondToNotification = async (req, res) => {
  try {
    const { action } = req.body;

    if (!["accept", "decline"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be either "accept" or "decline".',
      });
    }

    if (!mongoose.isValidObjectId(req.params.notificationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID.",
      });
    }

    const notification = await Notification.findOne({
      _id: req.params.notificationId,
      recipient: req.user._id,
      type: "battle_invite",
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Battle invitation not found.",
      });
    }

    if (action === "decline") {
      if (notification.status === "declined") {
        return res.status(200).json({
          success: true,
          message: "Battle invitation already declined.",
        });
      }
      if (notification.status === "accepted") {
        return res.status(409).json({
          success: false,
          message: "This battle invitation was already accepted.",
        });
      }
      notification.status = "declined";
      notification.readAt = new Date();
      await notification.save();

      return res.status(200).json({
        success: true,
        message: "Battle invitation declined.",
      });
    }

    if (notification.status === "declined") {
      return res.status(409).json({
        success: false,
        message: "This battle invitation was declined.",
      });
    }

    const room = await Room.findById(notification.data?.roomId);
    if (
      !room ||
      room.gameMode !== "BATTLE" ||
      room.status !== "Waiting" ||
      room.isQuizEnded
    ) {
      return res.status(400).json({
        success: false,
        message: "This battle room is no longer accepting players.",
      });
    }

    const inviterIsActiveMember = room.players.some(
      (item) =>
        String(item.user) === String(notification.actor) &&
        !item.isRemoved
    );
    if (!inviterIsActiveMember) {
      return res.status(403).json({
        success: false,
        message: "The person who invited you is no longer in this room.",
      });
    }

    const friendship = await Friendship.findOne({
      status: "accepted",
      $or: [
        { requester: req.user._id, recipient: notification.actor },
        { requester: notification.actor, recipient: req.user._id },
      ],
    });
    if (!friendship) {
      return res.status(403).json({
        success: false,
        message: "You are no longer friends with the person who invited you.",
      });
    }

    const player = room.players.find(
      (item) => String(item.user) === String(req.user._id)
    );

    if (player?.isRemoved) {
      return res.status(403).json({
        success: false,
        message: "You were removed from this room and cannot rejoin.",
      });
    }

    if (
      room.players.filter((item) => !item.isRemoved).length >= room.maxPlayers &&
      !player
    ) {
      return res.status(400).json({
        success: false,
        message: "This battle room is full.",
      });
    }

    notification.status = "accepted";
    await notification.save();

    return res.status(200).json({
      success: true,
      roomCode: room.roomCode,
      roomId: String(room._id),
      message: "Invitation accepted. Joining room...",
    });
  } catch (error) {
    console.error("Respond to notification error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to respond to notification.",
    });
  }
};

module.exports = {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  respondToNotification,
};
