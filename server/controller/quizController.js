
const mongoose = require("mongoose");
const crypto = require("crypto");

const Quiz = require("../model/Quiz");
const Question = require("../model/Question");
const Room = require("../model/Room");

const { generateQuiz } = require("../service/geminiService");
const cleanJson = require("../utils/cleanJson");

const ALLOWED_DIFFICULTIES = ["Easy", "Medium", "Hard"];

const ALLOWED_QUESTION_TYPES = [
    "MCQ",
    "CODING",
    "LONG",
    "TRUE_FALSE",
    "FILL",
];

const QUIZ_FIELDS = [
    "title",
    "description",
    "category",
    "topic",
    "difficulty",
    "questionCount",
    "questionTime",
    "quizDuration",
    "thumbnail",
    "visibility",
    "availableFrom",
    "availableUntil",
    "allowAnswerChange",
    "showLeaderboard",
    "showCorrectAnswers",
    "resultPublishMode",
];

function sendError(res, status, message) {
    return res.status(status).json({
        success: false,
        message,
    });
}

function isValidObjectId(id) {
    return mongoose.isValidObjectId(id);
}

function isAdmin(req) {
    return req.user?.role === "admin";
}

function sameId(first, second) {
    return String(first) === String(second);
}

function isWithinAvailability(quiz, now = new Date()) {
    if (quiz.availableFrom && now < quiz.availableFrom) {
        return false;
    }

    if (quiz.availableUntil && now >= quiz.availableUntil) {
        return false;
    }

    return true;
}

function isPubliclyAvailable(quiz) {
    return (
        quiz.status === "PUBLISHED" &&
        quiz.visibility === "PUBLIC" &&
        quiz.isTemporary !== true &&
        isWithinAvailability(quiz)
    );
}

function makeAccessCode() {
    return crypto.randomBytes(4).toString("hex").toUpperCase();
}

function buildQuizPayload(body, existing = {}) {
    const result = {};

    for (const field of QUIZ_FIELDS) {
        if (body[field] !== undefined) {
            result[field] = body[field];
        }
    }

    if (result.title !== undefined) {
        result.title = String(result.title).trim();
    }

    if (result.description !== undefined) {
        result.description = String(result.description || "").trim();
    }

    if (result.category !== undefined) {
        result.category = String(result.category).trim();
    }

    if (result.topic !== undefined) {
        result.topic = String(result.topic).trim();
    }

    if (result.thumbnail !== undefined) {
        result.thumbnail = String(result.thumbnail || "").trim();
    }

    if (result.questionCount !== undefined) {
        result.questionCount = Number(result.questionCount);
    }

    if (result.questionTime !== undefined) {
        result.questionTime = Number(result.questionTime);
    }

    if (result.quizDuration !== undefined) {
        result.quizDuration = Number(result.quizDuration);
    }

    if (result.questionTime !== undefined && result.quizDuration === undefined) {
        result.quizDuration = Number(
            body.quizDuration || existing.quizDuration || 20
        );
    }

    if (result.visibility !== undefined) {
        const visibility = String(result.visibility).toUpperCase();

        if (!["PUBLIC", "PRIVATE"].includes(visibility)) {
            throw new Error("Visibility must be PUBLIC or PRIVATE.");
        }

        result.visibility = visibility;
    }

    if (result.difficulty !== undefined &&
        !ALLOWED_DIFFICULTIES.includes(result.difficulty)) {
        throw new Error("Invalid quiz difficulty.");
    }

    if (result.availableFrom !== undefined) {
        result.availableFrom = result.availableFrom
            ? new Date(result.availableFrom)
            : null;
    }

    if (result.availableUntil !== undefined) {
        result.availableUntil = result.availableUntil
            ? new Date(result.availableUntil)
            : null;
    }

    if (
        result.availableFrom &&
        Number.isNaN(result.availableFrom.getTime())
    ) {
        throw new Error("Invalid quiz start date.");
    }

    if (
        result.availableUntil &&
        Number.isNaN(result.availableUntil.getTime())
    ) {
        throw new Error("Invalid quiz end date.");
    }

    const start = result.availableFrom ?? existing.availableFrom;
    const end = result.availableUntil ?? existing.availableUntil;

    if (start && end && start >= end) {
        throw new Error("Quiz end time must be after its start time.");
    }

    if (
        result.questionCount !== undefined &&
        (!Number.isInteger(result.questionCount) ||
            result.questionCount < 1 ||
            result.questionCount > 500)
    ) {
        throw new Error("Question count must be between 1 and 500.");
    }

    if (
        result.questionTime !== undefined &&
        (!Number.isFinite(result.questionTime) ||
            result.questionTime < 1 ||
            result.questionTime > 3600)
    ) {
        throw new Error("Question time must be between 1 and 3600 seconds.");
    }

    if (
        result.quizDuration !== undefined &&
        (!Number.isFinite(result.quizDuration) ||
            result.quizDuration < 1 ||
            result.quizDuration > 600)
    ) {
        throw new Error("Quiz duration must be between 1 and 600 minutes.");
    }

    return result;
}

async function getOwnedQuiz(quizId, userId) {
    if (!isValidObjectId(quizId)) {
        return null;
    }

    return Quiz.findOne({
        _id: quizId,
        createdBy: userId,
        isTemporary: { $ne: true },
    });
}

function safeQuestionForStudent(question) {
    const data = question.toObject
        ? question.toObject()
        : { ...question };

    delete data.correctAnswerIndex;

    if (data.trueFalse) {
        delete data.trueFalse.answer;
    }

    if (data.fillBlank) {
        delete data.fillBlank.answer;
    }

    if (data.longAnswer) {
        delete data.longAnswer.expectedAnswer;
    }

    if (data.coding) {
        delete data.coding.solutionCode;

        data.coding.testCases = (data.coding.testCases || [])
            .filter((testCase) => !testCase.isHidden);
    }

    return data;
}

/*
==================================================
Create a permanent manual quiz
Admin only
==================================================
*/
exports.createQuiz = async (req, res) => {
    try {
        const payload = buildQuizPayload(req.body);

        if (
            !payload.title ||
            !payload.category ||
            !payload.topic ||
            !payload.questionCount
        ) {
            return sendError(
                res,
                400,
                "Title, category, topic and question count are required."
            );
        }

        const visibility = payload.visibility || "PUBLIC";
        const accessCode =
            visibility === "PRIVATE" ? makeAccessCode() : undefined;

        const quiz = await Quiz.create({
            ...payload,

            // Do not allow a client to create a temporary quiz here.
            isTemporary: false,
            temporaryRoom: null,
            expiresAt: null,

            status: "DRAFT",
            visibility,
            accessCode,

            createdBy: req.user._id,
        });

        const responseQuiz = quiz.toObject();

        // Reveal the code only in this creator's creation response.
        if (accessCode) {
            responseQuiz.accessCode = accessCode;
        }

        return res.status(201).json({
            success: true,
            message: "Quiz created as a draft.",
            quiz: responseQuiz,
        });
    } catch (error) {
        console.error("Create quiz error:", error.message);

        return sendError(
            res,
            error.name === "ValidationError" ? 400 : 500,
            error.message || "Unable to create quiz."
        );
    }
};

/*
==================================================
Update a permanent quiz
Only the creating admin
==================================================
*/
exports.updateQuiz = async (req, res) => {
    try {
        const quiz = await getOwnedQuiz(req.params.quizId, req.user._id);

        if (!quiz) {
            return sendError(
                res,
                404,
                "Quiz not found or you do not own this quiz."
            );
        }

        // Do not change an active quiz's structure while attempts may be running.
        if (
            quiz.status === "PUBLISHED" &&
            quiz.availableFrom &&
            new Date() >= quiz.availableFrom &&
            (!quiz.availableUntil || new Date() < quiz.availableUntil)
        ) {
            return sendError(
                res,
                409,
                "An active quiz cannot be edited. Unpublish it or wait until it ends."
            );
        }

        const payload = buildQuizPayload(req.body, quiz);

        // These fields are controlled by server-side logic.
        delete payload.status;
        delete payload.createdBy;
        delete payload.isTemporary;
        delete payload.temporaryRoom;
        delete payload.expiresAt;
        delete payload.accessCode;

        Object.assign(quiz, payload);
        await quiz.save();

        return res.json({
            success: true,
            message: "Quiz updated successfully.",
            quiz,
        });
    } catch (error) {
        return sendError(
            res,
            error.name === "ValidationError" ? 400 : 500,
            error.message || "Unable to update quiz."
        );
    }
};

/*
==================================================
Delete a permanent quiz
Only its creating admin
==================================================
*/
exports.deleteQuiz = async (req, res) => {
    try {
        const quiz = await getOwnedQuiz(req.params.quizId, req.user._id);

        if (!quiz) {
            return sendError(
                res,
                404,
                "Quiz not found or you do not own this quiz."
            );
        }

        // Keep quiz and question records intact if attempts already exist.
        // We will apply full attempt/history protection in the response API step.
        const Response = require("../model/Response");

        const hasAttempts = await Response.exists({ quiz: quiz._id });

        if (hasAttempts) {
            quiz.status = "ARCHIVED";
            await quiz.save();

            return res.json({
                success: true,
                message: "Quiz archived because attempts already exist.",
            });
        }

        await Question.deleteMany({ quiz: quiz._id });
        await quiz.deleteOne();

        return res.json({
            success: true,
            message: "Quiz deleted successfully.",
        });
    } catch (error) {
        return sendError(res, 500, error.message || "Unable to delete quiz.");
    }
};

/*
==================================================
Publish a permanent quiz
Only its creating admin
==================================================
*/
exports.publishQuiz = async (req, res) => {
    try {
        const quiz = await getOwnedQuiz(req.params.quizId, req.user._id);

        if (!quiz) {
            return sendError(
                res,
                404,
                "Quiz not found or you do not own this quiz."
            );
        }

        if (quiz.isTemporary) {
            return sendError(res, 400, "Temporary quizzes cannot be published.");
        }

        const questionCount = await Question.countDocuments({
            quiz: quiz._id,
        });

        if (questionCount !== quiz.questionCount) {
            return sendError(
                res,
                400,
                `This quiz requires ${quiz.questionCount} questions, but currently has ${questionCount}.`
            );
        }

        if (
            quiz.availableFrom &&
            quiz.availableUntil &&
            quiz.availableFrom >= quiz.availableUntil
        ) {
            return sendError(
                res,
                400,
                "Quiz end time must be after its start time."
            );
        }

        quiz.status = "PUBLISHED";
        await quiz.save();

        return res.json({
            success: true,
            message: "Quiz published successfully.",
            quiz,
        });
    } catch (error) {
        return sendError(res, 500, error.message || "Unable to publish quiz.");
    }
};

/*
==================================================
Get quiz details
Public active quizzes can be viewed by users.
Drafts and private details are creator-only.
==================================================
*/
exports.getQuizById = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.quizId)) {
            return sendError(res, 400, "Invalid quiz ID.");
        }

        const quiz = await Quiz.findById(req.params.quizId)
            .populate("createdBy", "name");

        if (!quiz || quiz.isTemporary) {
            return sendError(res, 404, "Quiz not found.");
        }

        const isCreator =
            isAdmin(req) &&
            sameId(
                quiz.createdBy?._id || quiz.createdBy,
                req.user._id
            );

        if (!isCreator && !isPubliclyAvailable(quiz)) {
            return sendError(
                res,
                403,
                "This quiz is not available to you."
            );
        }

        const payload = quiz.toObject();

        // Never return the private code through a normal detail request.
        delete payload.accessCode;

        return res.json({
            success: true,
            quiz: payload,
        });
    } catch (error) {
        return sendError(res, 500, error.message || "Unable to load quiz.");
    }
};

/*
==================================================
List public active quizzes
No drafts, temporary quizzes or expired quizzes
==================================================
*/
exports.getQuizList = async (req, res) => {
    try {
        const now = new Date();

        const quizzes = await Quiz.find({
            status: "PUBLISHED",
            visibility: "PUBLIC",
            isTemporary: { $ne: true },

            $and: [
                {
                    $or: [
                        { availableFrom: null },
                        { availableFrom: { $exists: false } },
                        { availableFrom: { $lte: now } },
                    ],
                },
                {
                    $or: [
                        { availableUntil: null },
                        { availableUntil: { $exists: false } },
                        { availableUntil: { $gt: now } },
                    ],
                },
            ],
        })
            .select(
                "title description category topic difficulty questionCount quizDuration questionTime thumbnail availableFrom availableUntil createdBy"
            )
            .sort({ availableFrom: 1, createdAt: -1 })
            .lean();

        return res.json({
            success: true,
            total: quizzes.length,
            quizzes,
        });
    } catch (error) {
        return sendError(res, 500, error.message || "Unable to list quizzes.");
    }
};

/*
==================================================
Admin's own quiz library
Includes drafts and private quizzes, never other
admins' private codes.
==================================================
*/
exports.getMyQuizzes = async (req, res) => {
    try {
        const quizzes = await Quiz.find({
            createdBy: req.user._id,
            isTemporary: { $ne: true },
        })
            .select("-accessCode")
            .sort({ createdAt: -1 })
            .lean();

        return res.json({
            success: true,
            total: quizzes.length,
            quizzes,
        });
    } catch (error) {
        return sendError(res, 500, error.message || "Unable to list your quizzes.");
    }
};

/*
==================================================
View a private quiz code
Only the admin who created the quiz
==================================================
*/
exports.getPrivateQuizCode = async (req, res) => {
    try {
        const quiz = await Quiz.findOne({
            _id: req.params.quizId,
            createdBy: req.user._id,
            visibility: "PRIVATE",
            isTemporary: { $ne: true },
        }).select("+accessCode");

        if (!quiz) {
            return sendError(
                res,
                404,
                "Private quiz not found or you do not own it."
            );
        }

        return res.json({
            success: true,
            accessCode: quiz.accessCode,
        });
    } catch (error) {
        return sendError(res, 500, error.message || "Unable to retrieve quiz code.");
    }
};

/*
==================================================
Join a private quiz using its code
Returns safe quiz/question data.
Attempt endpoints must also enforce access rules.
==================================================
*/
exports.joinPrivateQuiz = async (req, res) => {
    try {
        const accessCode = String(req.body.accessCode || "")
            .trim()
            .toUpperCase();

        if (!accessCode) {
            return sendError(res, 400, "Private quiz code is required.");
        }

        const quiz = await Quiz.findOne({
            accessCode,
            visibility: "PRIVATE",
            status: "PUBLISHED",
            isTemporary: { $ne: true },
        });

        if (!quiz || !isWithinAvailability(quiz)) {
            return sendError(
                res,
                404,
                "Private quiz not found or the quiz is not currently available."
            );
        }

        const questions = await Question.find({ quiz: quiz._id })
            .sort({ createdAt: 1 })
            .lean();

        return res.json({
            success: true,
            message: "Private quiz code accepted.",
            quiz: {
                _id: quiz._id,
                title: quiz.title,
                description: quiz.description,
                category: quiz.category,
                topic: quiz.topic,
                difficulty: quiz.difficulty,
                questionCount: quiz.questionCount,
                quizDuration: quiz.quizDuration,
                availableFrom: quiz.availableFrom,
                availableUntil: quiz.availableUntil,
            },
            questions: questions.map(safeQuestionForStudent),
        });
    } catch (error) {
        return sendError(res, 500, error.message || "Unable to join private quiz.");
    }
};

/*
==================================================
Generate AI quiz
Admin: save permanent draft.
Regular user: create temporary quiz data for battle
use, excluded from the permanent quiz library.
==================================================
*/
exports.generateAIQuiz = async (req, res) => {
    let session;

    try {
        const {
            title,
            description = "",
            category,
            topic,
            difficulty = "Easy",
            questionCount,
            questionTime = 30,
            quizDuration = 20,
            questionTypes = ["MCQ"],
            visibility = "PUBLIC",
            roomId,
        } = req.body;

        if (
            typeof title !== "string" ||
            !title.trim() ||
            typeof category !== "string" ||
            !category.trim() ||
            typeof topic !== "string" ||
            !topic.trim()
        ) {
            return sendError(
                res,
                400,
                "Title, category and topic are required."
            );
        }

        if (!ALLOWED_DIFFICULTIES.includes(difficulty)) {
            return sendError(res, 400, "Invalid difficulty.");
        }

        if (
            !Number.isInteger(Number(questionCount)) ||
            Number(questionCount) < 1 ||
            Number(questionCount) > 30
        ) {
            return sendError(
                res,
                400,
                "Question count must be between 1 and 30."
            );
        }

        if (
            !Array.isArray(questionTypes) ||
            questionTypes.length === 0 ||
            questionTypes.some(
                (type) => !ALLOWED_QUESTION_TYPES.includes(type)
            )
        ) {
            return sendError(res, 400, "Invalid question types.");
        }

        const count = Number(questionCount);

        const aiResponse = await generateQuiz({
            topic: topic.trim(),
            difficulty,
            questionCount: count,
            questionTypes,
        });

        const parsedQuestions = JSON.parse(cleanJson(aiResponse));

        if (
            !Array.isArray(parsedQuestions) ||
            parsedQuestions.length !== count ||
            parsedQuestions.some(
                (question) =>
                    !question ||
                    typeof question.question !== "string" ||
                    !question.question.trim() ||
                    !ALLOWED_QUESTION_TYPES.includes(question.questionType) ||
                    !questionTypes.includes(question.questionType)
            )
        ) {
            return sendError(
                res,
                502,
                "The AI service returned invalid questions. Please try again."
            );
        }

        const questionDocuments = [];
        const seenQuestions = new Set();

        for (const question of parsedQuestions) {
            const normalized = question.question.trim().toLowerCase();

            if (seenQuestions.has(normalized)) {
                return sendError(
                    res,
                    502,
                    "The AI service returned duplicate questions. Please try again."
                );
            }

            seenQuestions.add(normalized);

            if (
                question.questionType === "MCQ" &&
                (
                    !Array.isArray(question.options) ||
                    question.options.length !== 4 ||
                    !Number.isInteger(question.correctAnswerIndex) ||
                    question.correctAnswerIndex < 0 ||
                    question.correctAnswerIndex > 3
                )
            ) {
                return sendError(
                    res,
                    502,
                    "The AI service returned an invalid multiple-choice question."
                );
            }

            questionDocuments.push({
                questionType: question.questionType,
                question: question.question.trim(),
                difficulty,
                marks: Number(question.marks) > 0 ? Number(question.marks) : 1,
                explanation: question.explanation || "",
                generatedByAI: true,

                options: Array.isArray(question.options)
                    ? question.options.map((option) => ({
                        text: typeof option === "string"
                            ? option
                            : option.text,
                    }))
                    : [],

                correctAnswerIndex: question.correctAnswerIndex ?? null,
                coding: question.coding || {},
                longAnswer: question.longAnswer || {},
                fillBlank: question.fillBlank || {},
                trueFalse: question.trueFalse || {},
            });
        }

        // A user-created AI quiz is temporary and must be used in a battle.
        // It is not listed in the permanent quiz catalogue.
        const temporary = !isAdmin(req);

        let temporaryRoom = null;

        if (temporary && roomId) {
            if (!isValidObjectId(roomId)) {
                return sendError(res, 400, "Invalid battle room ID.");
            }

            temporaryRoom = await Room.findOne({
                _id: roomId,
                host: req.user._id,
                status: "Waiting",
                gameMode: "BATTLE",
            });

            if (!temporaryRoom) {
                return sendError(
                    res,
                    403,
                    "Only the host of a waiting battle can generate its quiz."
                );
            }
        }

        session = await mongoose.startSession();
        session.startTransaction();

        const visibilityForQuiz = temporary
            ? "ROOM_ONLY"
            : String(visibility).toUpperCase();

        if (
            !temporary &&
            !["PUBLIC", "PRIVATE"].includes(visibilityForQuiz)
        ) {
            await session.abortTransaction();
            return sendError(res, 400, "Invalid quiz visibility.");
        }

        const accessCode =
            !temporary && visibilityForQuiz === "PRIVATE"
                ? makeAccessCode()
                : undefined;

        const [createdQuiz] = await Quiz.create(
            [
                {
                    title: title.trim(),
                    description: String(description || "").trim(),
                    category: category.trim(),
                    topic: topic.trim(),
                    difficulty,
                    questionCount: count,
                    questionTime: Number(questionTime),
                    quizDuration: Number(quizDuration),
                    generatedByAI: true,

                    isTemporary: temporary,
                    temporaryRoom: temporaryRoom?._id || null,
                    expiresAt: temporary
                        ? new Date(Date.now() + 2 * 60 * 60 * 1000)
                        : null,

                    status: temporary ? "PUBLISHED" : "DRAFT",
                    visibility: visibilityForQuiz,
                    accessCode,
                    createdBy: req.user._id,
                },
            ],
            { session }
        );

        await Question.insertMany(
            questionDocuments.map((question) => ({
                ...question,
                quiz: createdQuiz._id,
            })),
            { session }
        );

        if (temporaryRoom) {
            temporaryRoom.quiz = createdQuiz._id;
            temporaryRoom.quizSource = "AI";
            temporaryRoom.totalQuestions = count;
            await temporaryRoom.save({ session });
        }

        await session.commitTransaction();

        const quizPayload = createdQuiz.toObject();

        if (accessCode) {
            quizPayload.accessCode = accessCode;
        }

        return res.status(201).json({
            success: true,
            message: temporary
                ? "Temporary AI quiz generated for battle use."
                : "AI quiz saved as a permanent draft.",
            quiz: quizPayload,
            totalQuestions: count,
            temporary,
        });
    } catch (error) {
        if (session?.inTransaction()) {
            await session.abortTransaction();
        }

        console.error("AI quiz generation error:", error.message);

        const authError =
            error?.status === 401 ||
            error?.code === 401 ||
            /\bUNAUTHENTICATED\b|invalid authentication credentials/i.test(
                error?.message || ""
            );

        return sendError(
            res,
            authError ? 502 : 500,
            authError
                ? "The AI provider rejected the server credentials. Check GEMINI_API_KEY."
                : "AI quiz generation failed. Check the backend logs and try again."
        );
    } finally {
        if (session) {
            await session.endSession();
        }
    }
};
