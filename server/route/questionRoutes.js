
const express = require("express");
const router = express.Router();

const { protect, adminOnly } = require("../middleware/authMiddleware");

const {
    createQuestion,
    getQuestions,
    getAttemptQuestions,
    updateQuestion,
    deleteQuestion,
} = require("../controller/questioncontroller");

router.post("/create", protect, adminOnly, createQuestion);
router.get("/quiz/:quizId", protect, getQuestions);
router.get("/attempt/:quizId", protect, getAttemptQuestions);
router.put("/update/:questionId", protect, adminOnly, updateQuestion);
router.delete("/delete/:questionId", protect, adminOnly, deleteQuestion);

module.exports = router;
