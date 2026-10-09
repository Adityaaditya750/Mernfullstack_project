
const mongoose = require("mongoose");
const Question = require("../model/Question");
const Quiz = require("../model/Quiz");

const VALID_TYPES = [
    "MCQ",
    "CODING",
    "LONG",
    "TRUE_FALSE",
    "FILL",
    "IMAGE",
];

const VALID_DIFFICULTIES = ["Easy", "Medium", "Hard"];

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const sameId = (a, b) =>
    Boolean(a && b && a.toString() === b.toString());

const isAdmin = (req) => req.user?.role === "admin";

const isQuizOwner = (quiz, user) =>
    sameId(quiz.createdBy, user?._id);

const quizIsScheduledNow = (quiz) => {
    const now = new Date();

    if (quiz.availableFrom && now < new Date(quiz.availableFrom)) {
        return false;
    }

    if (quiz.availableUntil && now > new Date(quiz.availableUntil)) {
        return false;
    }

    return true;
};

/*
 * Never send correct answers, solutions, or expected answers
 * to a student before the attempt has been evaluated.
 */
const studentQuestion = (question) => {
    const item = question.toObject
        ? question.toObject()
        : { ...question };

    delete item.correctAnswerIndex;
    delete item.explanation;

    if (item.coding) {
        delete item.coding.solutionCode;
        delete item.coding.testCases;
    }

    if (item.longAnswer) {
        delete item.longAnswer.expectedAnswer;
    }

    if (item.fillBlank) {
        delete item.fillBlank.answer;
    }

    if (item.trueFalse) {
        delete item.trueFalse.answer;
    }

    return item;
};

const getQuizForAdmin = async (quizId, user) => {
    if (!isValidId(quizId)) {
        return { error: "Invalid quiz ID.", status: 400 };
    }

    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
        return { error: "Quiz not found.", status: 404 };
    }

    if (!isAdmin(user)) {
        return {
            error: "Only admins can manage quiz questions.",
            status: 403,
        };
    }

    if (!isQuizOwner(quiz, user)) {
        return {
            error: "You can manage questions only for quizzes you created.",
            status: 403,
        };
    }

    if (quiz.isTemporary) {
        return {
            error: "Temporary AI quiz questions are managed by the battle system.",
            status: 403,
        };
    }

    return { quiz };
};

/*
 * POST /api/question/create
 * Admin creates a question for a quiz they own.
 */
const createQuestion = async (req, res) => {
    try {
        const {
            quizId,
            questionType,
            question,
            difficulty,
            marks,
            explanation,
            image,
            options,
            correctAnswerIndex,
            coding,
            longAnswer,
            fillBlank,
            trueFalse,
        } = req.body;

        if (!quizId) {
            return res.status(400).json({
                success: false,
                message: "quizId is required.",
            });
        }

        const result = await getQuizForAdmin(quizId, req.user);

        if (result.error) {
            return res.status(result.status).json({
                success: false,
                message: result.error,
            });
        }

        const quiz = result.quiz;

        if (quiz.status === "PUBLISHED") {
            return res.status(400).json({
                success: false,
                message: "Unpublish the quiz before changing its questions.",
            });
        }

        if (!VALID_TYPES.includes(questionType)) {
            return res.status(400).json({
                success: false,
                message: "Invalid question type.",
            });
        }

        if (!question || !question.trim()) {
            return res.status(400).json({
                success: false,
                message: "Question text is required.",
            });
        }

        if (
            difficulty &&
            !VALID_DIFFICULTIES.includes(difficulty)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid question difficulty.",
            });
        }

        const questionData = {
            quiz: quiz._id,
            questionType,
            question: question.trim(),
            difficulty: difficulty || quiz.difficulty || "Easy",
            marks: Number(marks) > 0 ? Number(marks) : 1,
            explanation,
            image,
            options,
            correctAnswerIndex,
            coding,
            longAnswer,
            fillBlank,
            trueFalse,
        };

        if (questionType === "MCQ") {
            if (
                !Array.isArray(options) ||
                options.length < 2 ||
                !Number.isInteger(Number(correctAnswerIndex)) ||
                Number(correctAnswerIndex) < 0 ||
                Number(correctAnswerIndex) >= options.length
            ) {
                return res.status(400).json({
                    success: false,
                    message: "MCQ requires at least two options and a valid correctAnswerIndex.",
                });
            }
        }

        const createdQuestion = await Question.create(questionData);

        return res.status(201).json({
            success: true,
            message: "Question created successfully.",
            question: createdQuestion,
        });
    } catch (error) {
        console.error("createQuestion:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create question.",
            error: error.message,
        });
    }
};

/*
 * GET /api/question/quiz/:quizId
 * Admin owner gets questions with answers.
 * Students get safe question data only when the quiz is available publicly.
 *
 * Private quiz access must be authorized by the private-quiz join flow.
 */
const getQuestions = async (req, res) => {
    try {
        const { quizId } = req.params;

        if (!isValidId(quizId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid quiz ID.",
            });
        }

        const quiz = await Quiz.findById(quizId);

        if (!quiz) {
            return res.status(404).json({
                success: false,
                message: "Quiz not found.",
            });
        }

        const owner = isAdmin(req) && isQuizOwner(quiz, req.user);

        if (!owner) {
            const publiclyAvailable =
                !quiz.isTemporary &&
                quiz.visibility === "PUBLIC" &&
                quiz.status === "PUBLISHED" &&
                quizIsScheduledNow(quiz);

            if (!publiclyAvailable) {
                return res.status(403).json({
                    success: false,
                    message: "This quiz is not publicly available. Join it through its authorized access flow.",
                });
            }
        }

        const questions = await Question.find({ quiz: quiz._id })
            .sort({ createdAt: 1 });

        return res.status(200).json({
            success: true,
            totalQuestions: questions.length,
            questions: owner
                ? questions
                : questions.map(studentQuestion),
        });
    } catch (error) {
        console.error("getQuestions:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch questions.",
            error: error.message,
        });
    }
};

/*
 * GET /api/question/attempt/:quizId
 * Returns safe question data for an ordinary public quiz.
 *
 * Private quizzes and temporary battle quizzes should be served
 * through their authorized attempt/battle endpoints.
 */
const getAttemptQuestions = async (req, res) => {
    try {
        const { quizId } = req.params;

        if (!isValidId(quizId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid quiz ID.",
            });
        }

        const quiz = await Quiz.findById(quizId);

        if (!quiz) {
            return res.status(404).json({
                success: false,
                message: "Quiz not found.",
            });
        }

        const available =
            !quiz.isTemporary &&
            quiz.visibility === "PUBLIC" &&
            quiz.status === "PUBLISHED" &&
            quizIsScheduledNow(quiz);

        if (!available) {
            return res.status(403).json({
                success: false,
                message: "This quiz is not available for a normal public attempt.",
            });
        }

        const questions = await Question.find({ quiz: quiz._id })
            .sort({ createdAt: 1 });

        return res.status(200).json({
            success: true,
            quiz: {
                _id: quiz._id,
                title: quiz.title,
                category: quiz.category,
                topic: quiz.topic,
                difficulty: quiz.difficulty,
                questionCount: quiz.questionCount,
                quizDuration: quiz.quizDuration,
                questionTime: quiz.questionTime,
            },
            totalQuestions: questions.length,
            questions: questions.map(studentQuestion),
        });
    } catch (error) {
        console.error("getAttemptQuestions:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to load quiz attempt.",
            error: error.message,
        });
    }
};

/*
 * PUT /api/question/update/:questionId
 * Only the quiz creator can update its questions.
 */
const updateQuestion = async (req, res) => {
    try {
        const { questionId } = req.params;

        if (!isValidId(questionId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid question ID.",
            });
        }

        const existingQuestion = await Question.findById(questionId);

        if (!existingQuestion) {
            return res.status(404).json({
                success: false,
                message: "Question not found.",
            });
        }

        const result = await getQuizForAdmin(
            existingQuestion.quiz,
            req.user
        );

        if (result.error) {
            return res.status(result.status).json({
                success: false,
                message: result.error,
            });
        }

        if (result.quiz.status === "PUBLISHED") {
            return res.status(400).json({
                success: false,
                message: "Unpublish the quiz before changing its questions.",
            });
        }

        const allowedFields = [
            "questionType",
            "question",
            "difficulty",
            "marks",
            "explanation",
            "image",
            "options",
            "correctAnswerIndex",
            "coding",
            "longAnswer",
            "fillBlank",
            "trueFalse",
        ];

        for (const field of allowedFields) {
            if (Object.prototype.hasOwnProperty.call(req.body, field)) {
                existingQuestion.set(field, req.body[field]);
            }
        }

        if (!VALID_TYPES.includes(existingQuestion.questionType)) {
            return res.status(400).json({
                success: false,
                message: "Invalid question type.",
            });
        }

        await existingQuestion.save();

        return res.status(200).json({
            success: true,
            message: "Question updated successfully.",
            question: existingQuestion,
        });
    } catch (error) {
        console.error("updateQuestion:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update question.",
            error: error.message,
        });
    }
};

/*
 * DELETE /api/question/delete/:questionId
 * Only the quiz creator can delete a question.
 */
const deleteQuestion = async (req, res) => {
    try {
        const { questionId } = req.params;

        if (!isValidId(questionId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid question ID.",
            });
        }

        const question = await Question.findById(questionId);

        if (!question) {
            return res.status(404).json({
                success: false,
                message: "Question not found.",
            });
        }

        const result = await getQuizForAdmin(question.quiz, req.user);

        if (result.error) {
            return res.status(result.status).json({
                success: false,
                message: result.error,
            });
        }

        if (result.quiz.status === "PUBLISHED") {
            return res.status(400).json({
                success: false,
                message: "Unpublish the quiz before deleting its questions.",
            });
        }

        await Question.findByIdAndDelete(questionId);

        return res.status(200).json({
            success: true,
            message: "Question deleted successfully.",
        });
    } catch (error) {
        console.error("deleteQuestion:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete question.",
            error: error.message,
        });
    }
};

module.exports = {
    createQuestion,
    getQuestions,
    getAttemptQuestions,
    updateQuestion,
    deleteQuestion,
};
