
const crypto = require("crypto");
const Room = require("../model/Room");
const User = require("../model/User");
const Friendship = require("../model/Friendship");

// Pending invitations are kept in memory for this server process.
const pendingInvitations = new Map();

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
      const duplicate = [...pendingInvitations.values()].find(
        (invite) =>
          invite.senderId === senderId &&
          invite.recipientId === recipientId &&
          invite.roomCode === room.roomCode
      );

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

      pendingInvitations.set(invitationId, invitation);

      // The recipient's private room is established by socket.js.
      io.to(`user:${recipientId}`).emit(
        "battle-invitation-received",
        {
          invitationId,
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

      const invitation = pendingInvitations.get(invitationId);

      if (!invitation || invitation.recipientId !== senderId) {
        throw new Error("Invitation not found or already handled.");
      }

      if (action === "decline") {
        pendingInvitations.delete(invitationId);

        io.to(`user:${invitation.senderId}`).emit(
          "battle-invitation-declined",
          {
            invitationId,
            recipientId: senderId,
            roomCode: invitation.roomCode,
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
        invitation.roomCode,
        invitation.senderId,
        senderId
      );

      // Keep the invitation pending if validation fails so the
      // recipient can still decline it.
      socket.emit("battle-invitation-accepted-ready", {
        invitationId,
        roomCode: room.roomCode,
        roomName: room.roomName,
        message: "Invitation accepted. Join the room to continue.",
      });

      io.to(`user:${invitation.senderId}`).emit(
        "battle-invitation-accepted",
        {
          invitationId,
          recipientId: senderId,
          roomCode: room.roomCode,
        }
      );

      pendingInvitations.delete(invitationId);
    } catch (error) {
      socket.emit("battle-invitation-error", {
        action: "respond",
        message: error.message || "Unable to respond to invitation.",
      });
    }
  });

  // Remove invitations created by a user when that user disconnects.
  // Invitations addressed to the disconnected user remain pending.
  socket.on("disconnect", () => {
    for (const [id, invitation] of pendingInvitations.entries()) {
      if (invitation.senderId === senderId) {
        pendingInvitations.delete(id);
      }
    }
  });
};
