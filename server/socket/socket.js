
const socketAuth = require("../middleware/socketAuth");
const battleSocket = require("./battleSocket");
const battleInviteSocket = require("./battleInviteSocket");
const Friendship = require("../model/Friendship");

async function getFriendIds(userId) {
  const friendships = await Friendship.find({
    status: "accepted",
    $or: [
      { requester: userId },
      { recipient: userId },
    ],
  })
    .select("requester recipient")
    .lean();

  return friendships.map((friendship) =>
    String(friendship.requester) === String(userId)
      ? String(friendship.recipient)
      : String(friendship.requester)
  );
}

async function notifyFriendsPresence(io, userId, status) {
  const friendIds = await getFriendIds(userId);

  for (const friendId of friendIds) {
    io.to(`user:${friendId}`).emit("friend-presence", {
      userId: String(userId),
      status,
    });
  }
}

async function notifyConnectedUserOfFriendPresence(io, socket, userId) {
  const friendIds = await getFriendIds(userId);
  const friendStatuses = await Promise.all(
    friendIds.map(async (friendId) => {
      const connectedSockets = await io
        .in(`user:${friendId}`)
        .fetchSockets();

      return [
        friendId,
        connectedSockets.length ? "online" : "offline",
      ];
    })
  );

  socket.emit("friend-presence-snapshot", {
    statuses: Object.fromEntries(friendStatuses),
  });
}

module.exports = (io) => {
  console.log("Socket.IO Initialized");

  io.use(socketAuth);

  io.on("connection", (socket) => {
    const userId = String(socket.user._id);
    const personalRoom = `user:${userId}`;

    socket.join(personalRoom);

    console.log(`User Connected: ${socket.id}, User: ${userId}`);

    // Existing battle-room events remain intact.
    battleSocket(io, socket);

    // New battle-invitation events.
    battleInviteSocket(io, socket);

    notifyFriendsPresence(io, userId, "online").catch((error) => {
      console.error("Online presence error:", error.message);
    });

    notifyConnectedUserOfFriendPresence(io, socket, userId).catch((error) => {
      console.error("Initial friend presence error:", error.message);
    });

    socket.on("disconnect", async (reason) => {
      try {
        const remainingSockets = await io
          .in(personalRoom)
          .fetchSockets();

        if (remainingSockets.length === 0) {
          await notifyFriendsPresence(io, userId, "offline");
        }
      } catch (error) {
        console.error("Offline presence error:", error.message);
      }

      console.log(
        `User Disconnected: ${socket.id}, User: ${userId}, Reason: ${reason}`
      );
    });
  });
};
