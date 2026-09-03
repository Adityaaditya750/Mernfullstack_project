const express = require("express");
const router = express.Router();

const { protect, adminOnly } = require("../middleware/authMiddleware");

const {
    createQuiz,
    updateQuiz,
    deleteQuiz,
    publishQuiz,
    getQuizById,
    getQuizList,
    generateAIQuiz
} = require("../controller/QuizController");

/*
==================================================
Admin Routes
==================================================
*/

// Create Manual Quiz
router.post("/create", protect, adminOnly, createQuiz);

// Generate AI Quiz
router.post("/generate-ai", protect, adminOnly, generateAIQuiz);

// Update Quiz
router.put("/update/:quizId", protect, adminOnly, updateQuiz);

// Delete Quiz
router.delete("/delete/:quizId", protect, adminOnly, deleteQuiz);

// Publish Quiz
router.put("/publish/:quizId", protect, adminOnly, publishQuiz);

/*
==================================================
User Routes
==================================================
*/

// Quiz Library
router.get("/list", protect, getQuizList);

// Quiz Details
router.get("/:quizId", protect, getQuizById);

module.exports = router;