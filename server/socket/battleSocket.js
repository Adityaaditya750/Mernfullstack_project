
const Room = require("../model/Room");

module.exports = (io, socket) => {
    socket.on("join-room", async ({ roomCode } = {}) => {
        try {
            if (!socket.user?._id) {
                throw new Error("Authentication required.");
            }

            if (!roomCode || typeof roomCode !== "string") {
                throw new Error("Room code is required.");
            }

            const normalizedCode = roomCode.trim().toUpperCase();

            const room = await Room.findOne({
                roomCode: normalizedCode,
                "players.user": socket.user._id,
            });

            if (!room) {
                throw new Error("Room not found or you are not a member.");
            }

            socket.join(room.roomCode);

            socket.emit("room-updated", {
                roomId: room._id,
                roomCode: room.roomCode,
                status: room.status,
            });
        } catch (error) {
            socket.emit("room-error", {
                message: error.message || "Unable to join the room.",
            });
        }
    });
};
