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

    getCurrentQuestion

} = require("../controller/roomController");

const {

    protect

} = require("../middleware/authMiddleware");

/*
====================================
Room
====================================
*/

router.post("/create", protect, createRoom);

router.post("/join", protect, joinRoom);

router.get("/:roomId", protect, getRoom);

router.delete("/:roomId/leave", protect, leaveRoom);

/*
====================================
Battle
====================================
*/

router.put("/:roomId/ready", protect, toggleReady);

router.put("/:roomId/start", protect, startRoom);

router.put("/:roomId/select-quiz", protect, selectQuiz);

router.put("/:roomId/next-question", protect, nextQuestion);

router.post("/submit-answer", protect, submitBattleAnswer);

router.put("/:roomId/end", protect, endBattle);

router.get("/:roomId/leaderboard", protect, getLeaderboard);

router.get(
    "/:roomId/current-question",
    protect,
    getCurrentQuestion
);

module.exports = router;