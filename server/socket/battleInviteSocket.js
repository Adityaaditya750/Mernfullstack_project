
const crypto = require("crypto");
const Room = require("../model/Room");
const User = require("../model/User");
const Friendship = require("../model/Friendship");
const Notification = require("../model/Notification");
const { createNotification } = require("../service/notificationService");

async function getRoomForInvite(roomCode, senderId, recipientId) {
  const room = await Room.findOne({
    roomCode: String(roomCode || "").trim().toUpperCase(),
  }).populate("host", "name username");

  if (!room) {
    throw new Error("Battle room not found.");
  }

  if (room.status !== "Waiting") {
    throw new Error("This battle room is no longer accepting players.");
  }

  const senderIsMember = room.players.some(
    (player) =>
      String(player.user) === String(senderId) &&
      !player.isRemoved
  );

  if (!senderIsMember) {
    throw new Error("You must be a room member to invite friends.");
  }

  const recipientAlreadyInRoom = room.players.some(
    (player) =>
      String(player.user) === String(recipientId) &&
      !player.isRemoved
  );

  if (recipientAlreadyInRoom) {
    throw new Error("This player is already in the room.");
  }

  const activePlayers = room.players.filter(
    (player) => !player.isRemoved
  ).length;

  if (activePlayers >= room.maxPlayers) {
    throw new Error("This battle room is full.");
  }

  const friendship = await Friendship.findOne({
    status: "accepted",
    $or: [
      { requester: senderId, recipient: recipientId },
      { requester: recipientId, recipient: senderId },
    ],
  });

  if (!friendship) {
    throw new Error("You can only invite accepted friends.");
  }

  return room;
}

module.exports = (io, socket) => {
  const senderId = String(socket.user._id);

  // SEND INVITATION
  socket.on("send-battle-invite", async (data = {}) => {
    try {
      const recipientId = String(data.recipientId || "");
      const roomCode = String(data.roomCode || "")
        .trim()
        .toUpperCase();

      if (!recipientId || !roomCode) {
        throw new Error("Recipient and room code are required.");
      }

      if (!/^[a-f\d]{24}$/i.test(recipientId)) {
        throw new Error("Invalid recipient ID.");
      }

      if (recipientId === senderId) {
        throw new Error("You cannot invite yourself.");
      }

      const recipient = await User.findById(recipientId)
        .select("_id name username");

      if (!recipient) {
        throw new Error("Invited player not found.");
      }

      const room = await getRoomForInvite(
        roomCode,
        senderId,
        recipientId
      );

      // Prevent repeated outstanding invitations to the same room
      // from the same sender to the same recipient.
      const duplicate = await Notification.exists({
        recipient: recipientId,
        actor: senderId,
        type: "battle_invite",
        "data.roomId": String(room._id),
        $or: [
          { status: "pending" },
          { status: "accepted", readAt: null },
        ],
      });

      if (duplicate) {
        throw new Error("An invitation is already pending.");
      }

      const invitationId = crypto.randomUUID();

      const invitation = {
        invitationId,
        senderId,
        recipientId,
        roomCode: room.roomCode,
        roomId: String(room._id),
        createdAt: new Date().toISOString(),
      };

      const notification = await createNotification(io, {
        recipient: recipientId,
        actor: senderId,
        type: "battle_invite",
        title: "Battle room invitation",
        message: `${socket.user.name || socket.user.username || "A friend"} invited you to ${room.roomName}.`,
        data: {
          invitationId,
          roomId: String(room._id),
          roomCode: room.roomCode,
          roomName: room.roomName,
        },
        status: "pending",
      });

      // The recipient's private room is established by socket.js.
      io.to(`user:${recipientId}`).emit(
        "battle-invitation-received",
        {
          invitationId,
          notificationId: String(notification._id),
          roomCode: room.roomCode,
          roomName: room.roomName,
          host: room.host
            ? {
                _id: String(room.host._id),
                name: room.host.name,
                username: room.host.username,
              }
            : null,
          invitedBy: {
            _id: senderId,
            name: socket.user.name,
            username: socket.user.username,
          },
          createdAt: invitation.createdAt,
        }
      );

      socket.emit("battle-invitation-sent", {
        invitationId,
        recipient: {
          _id: String(recipient._id),
          name: recipient.name,
          username: recipient.username,
        },
        roomCode: room.roomCode,
        message: "Battle invitation sent.",
      });
    } catch (error) {
      socket.emit("battle-invitation-error", {
        action: "send",
        recipientId: String(data.recipientId || ""),
        message: error.message || "Unable to send invitation.",
      });
    }
  });

  // ACCEPT OR DECLINE INVITATION
  socket.on("respond-battle-invite", async (data = {}) => {
    try {
      const invitationId = String(data.invitationId || "");
      const action = data.action;

      if (!invitationId || !["accept", "decline"].includes(action)) {
        throw new Error(
          'Invitation ID and action ("accept" or "decline") are required.'
        );
      }

      const notification = await Notification.findOne({
        type: "battle_invite",
        recipient: senderId,
        "data.invitationId": invitationId,
      });

      if (!notification) {
        throw new Error("Invitation not found or already handled.");
      }

      if (
        (notification.status === "declined" && action === "accept") ||
        (notification.status === "accepted" && action === "decline")
      ) {
        throw new Error(
          notification.status === "declined"
            ? "This battle invitation was declined."
            : "This battle invitation was already accepted."
        );
      }

      if (action === "decline") {
        notification.status = "declined";
        notification.readAt = new Date();
        await notification.save();

        io.to(`user:${String(notification.actor)}`).emit(
          "battle-invitation-declined",
          {
            invitationId,
            recipientId: senderId,
            roomCode: notification.data.roomCode,
          }
        );

        socket.emit("battle-invitation-response", {
          invitationId,
          action: "decline",
          message: "Invitation declined.",
        });

        return;
      }

      // Revalidate everything when the recipient accepts.
      const room = await getRoomForInvite(
        notification.data.roomCode,
        String(notification.actor),
        senderId
      );

      notification.status = "accepted";
      await notification.save();

      socket.emit("battle-invitation-accepted-ready", {
        invitationId,
        roomCode: room.roomCode,
        roomName: room.roomName,
        message: "Invitation accepted. Join the room to continue.",
      });

      io.to(`user:${String(notification.actor)}`).emit(
        "battle-invitation-accepted",
        {
          invitationId,
          recipientId: senderId,
          roomCode: room.roomCode,
        }
      );

    } catch (error) {
      socket.emit("battle-invitation-error", {
        action: "respond",
        message: error.message || "Unable to respond to invitation.",
      });
    }
  });

};
