
const Room = require("../model/Room");

module.exports = (io, socket) => {
  socket.on("join-room", async (payload = {}) => {
    try {
      // 1. Verify socket authentication
      if (!socket.user?._id) {
        throw new Error("Authentication required.");
      }

      // 2. Validate payload and room code
      if (!payload || typeof payload !== "object") {
        throw new Error("Invalid room data.");
      }

      const { roomCode } = payload;

      if (!roomCode || typeof roomCode !== "string") {
        throw new Error("Room code is required.");
      }

      const normalizedCode = roomCode.trim().toUpperCase();

      // 3. Find the room
      const room = await Room.findOne({
        roomCode: normalizedCode,
        "players.user": socket.user._id,
      });

      if (!room) {
        throw new Error(
          "Room not found or you are not a member."
        );
      }

      // 4. Verify that the player is still active
      const player = room.players.find(
        (item) =>
          String(item.user) === String(socket.user._id)
      );

      if (!player || player.isRemoved) {
        throw new Error(
          "You are not an active member of this room."
        );
      }

      // 5. Join the Socket.IO room
      await socket.join(room.roomCode);

      // 6. Count active players
      const activePlayers = room.players.filter(
        (item) => !item.isRemoved
      );

      // 7. Notify other connected room members
      socket.to(room.roomCode).emit("room-updated", {
        roomId: String(room._id),
        roomCode: room.roomCode,
        status: room.status,
        activePlayers: activePlayers.length,
        maxPlayers: room.maxPlayers,
        playerIds: activePlayers.map(
          (item) => String(item.user)
        ),
      });

      // 8. Confirm successful join to this socket
      socket.emit("room-joined", {
        roomId: String(room._id),
        roomCode: room.roomCode,
        status: room.status,
        activePlayers: activePlayers.length,
        maxPlayers: room.maxPlayers,
      });
    } catch (error) {
      socket.emit("room-error", {
        message: error.message || "Unable to join the room.",
      });
    }
  });
};
