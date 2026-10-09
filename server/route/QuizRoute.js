
const express = require("express");
const router = express.Router();

const {
    protect,
    adminOnly,
} = require("../middleware/authMiddleware");

const {
    createQuiz,
    updateQuiz,
    deleteQuiz,
    publishQuiz,
    getQuizById,
    getQuizList,
    getMyQuizzes,
    getPrivateQuizCode,
    joinPrivateQuiz,
    generateAIQuiz,
} = require("../controller/quizController");

// Public quiz catalogue (authentication required in the current app).
router.get("/list", protect, getQuizList);

// Admin: see only quizzes created by the logged-in admin.
router.get("/my-quizzes", protect, adminOnly, getMyQuizzes);

// Private quiz access.
router.post("/join-private", protect, joinPrivateQuiz);

// Admin: retrieve the private code for their own quiz.
router.get(
    "/:quizId/private-code",
    protect,
    adminOnly,
    getPrivateQuizCode
);

// Create a permanent manual quiz.
router.post("/create", protect, adminOnly, createQuiz);

// AI generation:
// Admin = permanent draft.
// Regular user = temporary quiz for battle use.
router.post("/generate-ai", protect, generateAIQuiz);

// Admin: manage their own quizzes.
// Ownership is checked inside each controller.
router.put("/update/:quizId", protect, adminOnly, updateQuiz);
router.delete("/delete/:quizId", protect, adminOnly, deleteQuiz);
router.put("/publish/:quizId", protect, adminOnly, publishQuiz);

// Quiz details. This route must stay after the named routes above.
router.get("/:quizId", protect, getQuizById);

module.exports = router;
