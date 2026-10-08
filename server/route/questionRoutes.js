const express = require("express");

const router = express.Router();

const {

createQuestion,

getQuestions,

getAttemptQuestions,

updateQuestion,

deleteQuestion

} = require("../controller/questionController");

const {

protect,

adminOnly

} = require("../middleware/authMiddleware");

/*
=====================================
Admin
=====================================
*/

router.post("/create", protect, adminOnly, createQuestion);

router.put("/update/:questionId", protect, adminOnly, updateQuestion);

router.delete("/delete/:questionId", protect, adminOnly, deleteQuestion);

/*
=====================================
Users
=====================================
*/

router.get("/:quizId", protect, getQuestions);

router.get("/:quizId/attempt", protect, getAttemptQuestions);

module.exports = router;