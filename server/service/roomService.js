const Room = require("../model/Room");
exports.createBattleRoom = async (
    userId,
    roomName,
    roomType,
    maxPlayers,
    timerMode,
    battleTime
) => {
    if (!roomName?.trim()) {
        throw new Error("Room name is required.");
    }

    if (!["Private", "Public"].includes(roomType)) {
        throw new Error("Invalid room type.");
    }

    if (![2, 3, 4, 5, 6, 8].includes(Number(maxPlayers))) {
        throw new Error("Invalid maximum player count.");
    }

    if (!["QUESTION", "QUIZ"].includes(timerMode)) {
        throw new Error("Invalid timer mode.");
    }

    const duration = Number(battleTime);

    if (
        !Number.isFinite(duration) ||
        duration < 60 ||
        duration > 10800
    ) {
        throw new Error(
            "Battle time must be between 1 and 180 minutes."
        );
    }

    const room = await Room.create({
        roomName: roomName.trim(),
        roomType,
        gameMode: "BATTLE",
        host: userId,
        maxPlayers: Number(maxPlayers),
        timerMode,
        battleTime: duration,
        remainingTime: timerMode === "QUIZ" ? duration : 0,
        players: [
            {
                user: userId,
                isHost: true,
                isReady: true
            }
        ]
    });

    return room;
};