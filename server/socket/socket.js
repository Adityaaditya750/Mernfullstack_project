const socketAuth = require("../middleware/socketAuth");
const battleSocket = require("./battleSocket");
const battleInviteSocket = require("./battleInviteSocket");
const Friendship = require("../model/Friendship");
const Room = require("../model/Room");

const HOST_DISCONNECT_GRACE_MS = 8000;

/* =========================================
   FRIEND PRESENCE
========================================= */

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

async function notifyConnectedUserOfFriendPresence(
  io,
  socket,
  userId
) {
  const friendIds = await getFriendIds(userId);

  const friendStatuses = await Promise.all(
    friendIds.map(async (friendId) => {
      const connectedSockets = await io
        .in(`user:${friendId}`)
        .fetchSockets();

      return [
        friendId,
        connectedSockets.length > 0 ? "online" : "offline",
      ];
    })
  );

  socket.emit("friend-presence-snapshot", {
    statuses: Object.fromEntries(friendStatuses),
  });
}

/* =========================================
   CLOSE HOST'S WAITING BATTLES
========================================= */

const delay = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function closeHostWaitingRooms(io, userId) {
  await delay(HOST_DISCONNECT_GRACE_MS);

  // If another tab/device remains connected, preserve the rooms.
  const connectedSockets = await io
    .in(`user:${userId}`)
    .fetchSockets();

  if (connectedSockets.length > 0) {
    return;
  }

  const waitingRooms = await Room.find({
    host: userId,
    gameMode: "BATTLE",
    status: "Waiting",
    isQuizStarted: { $ne: true },
    isQuizEnded: { $ne: true },
  }).select("_id roomCode");

  for (const waitingRoom of waitingRooms) {
    const roomId = String(waitingRoom._id);
    const roomCode = waitingRoom.roomCode;

    // Recheck the room state before deleting it.
    const deletedRoom = await Room.findOneAndDelete({
      _id: waitingRoom._id,
      host: userId,
      gameMode: "BATTLE",
      status: "Waiting",
      isQuizStarted: { $ne: true },
      isQuizEnded: { $ne: true },
    });

    if (!deletedRoom) {
      continue;
    }

    if (roomCode) {
      io.to(roomCode).emit("room-closed", {
        roomId,
        message:
          "The host disconnected. This waiting room has been closed.",
      });
    }

    io.emit("public-battles-updated", {
      roomId,
      roomCode: roomCode || null,
      status: "Closed",
    });

    console.log(
      `Closed waiting battle ${roomCode || roomId}: host disconnected.`
    );
  }
}

/* =========================================
   SOCKET INITIALIZATION
========================================= */

module.exports = (io) => {
  console.log("Socket.IO Initialized");

  // Authenticate every socket connection.
  io.use(socketAuth);

  io.on("connection", (socket) => {
    const userId = String(socket.user._id);
    const personalRoom = `user:${userId}`;

    // IMPORTANT:
    // Use the verified user ID, never a client-supplied ID.
    socket.join(personalRoom);

    console.log(
      `User Connected: ${socket.id}, User: ${userId}`
    );

    // Existing battle events.
    battleSocket(io, socket);

    // Existing battle-invitation events.
    battleInviteSocket(io, socket);

    // Friend online presence.
    notifyFriendsPresence(io, userId, "online").catch(
      (error) => {
        console.error(
          "Online presence error:",
          error.message
        );
      }
    );

    // Send current friend-presence status to this user.
    notifyConnectedUserOfFriendPresence(
      io,
      socket,
      userId
    ).catch((error) => {
      console.error(
        "Initial friend presence error:",
        error.message
      );
    });

    /* =====================================
       DISCONNECT
    ===================================== */

    socket.on("disconnect", async (reason) => {
      try {
        const remainingSockets = await io
          .in(personalRoom)
          .fetchSockets();

        // Only mark offline when the user's final connection closes.
        if (remainingSockets.length === 0) {
          await notifyFriendsPresence(io, userId, "offline");

          closeHostWaitingRooms(io, userId).catch(
            (error) => {
              console.error(
                "Waiting-room cleanup error:",
                error.message
              );
            }
          );
        }
      } catch (error) {
        console.error(
          "Disconnect handling error:",
          error.message
        );
      }

      console.log(
        `User Disconnected: ${socket.id}, User: ${userId}, Reason: ${reason}`
      );
    });
  });
};