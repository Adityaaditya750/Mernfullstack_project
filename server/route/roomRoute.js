const express = require("express");
const router = express.Router();

const {
    createRoom,
    joinRoom,
    getRoom,
    leaveRoom,
    toggleReady,
    startRoom,
    selectQuiz,
    nextQuestion,
    submitBattleAnswer,
    endBattle,
    getLeaderboard,
    getCurrentQuestion,
    getPublicRooms,
    removePlayer,
} = require("../controller/roomController");

const { protect } = require("../middleware/authMiddleware");

// Validate imported handlers before registering routes.
const handlers = {
    protect,
    createRoom,
    joinRoom,
    getRoom,
    leaveRoom,
    toggleReady,
    startRoom,
    selectQuiz,
    nextQuestion,
    submitBattleAnswer,
    endBattle,
    getLeaderboard,
    getCurrentQuestion,
    getPublicRooms,
    removePlayer,
};

const missingHandlers = Object.entries(handlers)
    .filter(([, handler]) => typeof handler !== "function")
    .map(([name]) => name);

if (missingHandlers.length > 0) {
    throw new Error(
        `Missing or invalid room route handlers: ${missingHandlers.join(", ")}. Check roomController.js and authMiddleware.js exports.`
    );
}

// Room routes
router.post("/create", protect, createRoom);
router.post("/join", protect, joinRoom);

// Keep specific routes before /:roomId.
router.get("/public", protect, getPublicRooms);

// Room management
router.get("/:roomId", protect, getRoom);
router.delete("/:roomId/leave", protect, leaveRoom);
router.delete("/:roomId/players/:playerId", protect, removePlayer);

// Battle routes
router.put("/:roomId/ready", protect, toggleReady);
router.put("/:roomId/start", protect, startRoom);
router.put("/:roomId/select-quiz", protect, selectQuiz);
router.put("/:roomId/next-question", protect, nextQuestion);
router.post("/submit-answer", protect, submitBattleAnswer);
router.put("/:roomId/end", protect, endBattle);

// Results
router.get("/:roomId/leaderboard", protect, getLeaderboard);
router.get("/:roomId/current-question", protect, getCurrentQuestion);

module.exports = router;