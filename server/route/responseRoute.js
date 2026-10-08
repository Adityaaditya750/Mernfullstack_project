const express = require("express");

const router = express.Router();

const {

    startQuiz,

    submitAnswer,

    completeQuiz,

    finishQuiz,

    autoSubmitQuiz,

    getResult,

    getMyResults

} = require("../controller/responseController");

const {

    protect

} = require("../middleware/authMiddleware");

router.post("/start", protect, startQuiz);

router.post("/submit", protect, submitAnswer);

router.post("/complete", protect, completeQuiz);

router.post("/finish", protect, finishQuiz);

router.post("/auto-submit", protect, autoSubmitQuiz);

router.get("/history", protect, getMyResults);

router.get("/result/:responseId", protect, getResult);

module.exports = router;