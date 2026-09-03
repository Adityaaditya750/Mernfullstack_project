const express = require("express");

const router = express.Router();

const {

    startQuiz,

    submitAnswer,

    finishQuiz,

    autoSubmitQuiz,

    getResult

} = require("../controller/responseController");

const {

    protect

} = require("../middleware/authMiddleware");

router.post("/start", protect, startQuiz);

router.post("/submit", protect, submitAnswer);

router.post("/finish", protect, finishQuiz);

router.post("/auto-submit", protect, autoSubmitQuiz);

router.get("/result/:responseId", protect, getResult);

module.exports = router;