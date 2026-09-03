const mongoose = require("mongoose");
const Quiz = require("../model/Quiz");
const Question = require("../model/Question");

const { generateQuiz } = require("../service/geminiService");
const cleanJson = require("../utils/cleanJson");

/*
====================================
Create Quiz
====================================
*/

exports.createQuiz = async (req, res) => {

    try {

        const {

            title,

            description,

            category,

            topic,

            difficulty,

            questionCount,

            questionTime,

            thumbnail,

            visibility

        } = req.body;

        const quiz = await Quiz.create({

            title,

            description,

            category,

            topic,

            difficulty,

            questionCount,

            questionTime,

            thumbnail,

            visibility,

            createdBy: req.user._id

        });

        res.status(201).json({

            success: true,

            message: "Quiz Created Successfully",

            quiz

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

/*
====================================
Update Quiz
====================================
*/

exports.updateQuiz = async (req, res) => {

    try {

        const quiz = await Quiz.findByIdAndUpdate(

            req.params.quizId,

            req.body,

            { new: true }

        );

        if (!quiz) {

            return res.status(404).json({

                success: false,

                message: "Quiz not found"

            });

        }

        res.json({

            success: true,

            message: "Quiz Updated",

            quiz

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

/*
====================================
Delete Quiz
====================================
*/

exports.deleteQuiz = async (req, res) => {

    try {

        await Question.deleteMany({

            quiz: req.params.quizId

        });

        await Quiz.findByIdAndDelete(

            req.params.quizId

        );

        res.json({

            success: true,

            message: "Quiz Deleted"

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

/*
====================================
Publish Quiz
====================================
*/

exports.publishQuiz = async (req, res) => {

    try {

        const quiz = await Quiz.findByIdAndUpdate(

            req.params.quizId,

            {

                status: "PUBLISHED"

            },

            {

                new: true

            }

        );

        res.json({

            success: true,

            message: "Quiz Published",

            quiz

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

/*
====================================
Get Quiz By ID
====================================
*/

exports.getQuizById = async (req, res) => {

    try {

        const quiz = await Quiz.findById(req.params.quizId)

            .populate("createdBy", "name");

        if (!quiz) {

            return res.status(404).json({

                success: false,

                message: "Quiz not found"

            });

        }

        res.json({

            success: true,

            quiz

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

/*
====================================
Quiz Library
====================================
*/

exports.getQuizList = async (req, res) => {

    try {

        const quizzes = await Quiz.find({

            status: "PUBLISHED",

            visibility: "PUBLIC"

        })

        .select(

            "title category topic difficulty questionCount generatedByAI thumbnail"

        )

        .sort({

            createdAt: -1

        });

        res.json({

            success: true,

            total: quizzes.length,

            quizzes

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};


/*
====================================
Generate AI Quiz
====================================
*/

exports.generateAIQuiz = async (req, res) => {

    const session = await mongoose.startSession();

    session.startTransaction();

    try {

        const {

            title,
            description,
            category,
            topic,
            difficulty,
            questionCount,
            questionTime,
            questionTypes

        } = req.body;

        /*
        ===============================
        Validation
        ===============================
        */

        if (
            !title ||
            !category ||
            !topic ||
            !difficulty ||
            !questionCount ||
            !questionTypes
        ) {

            await session.abortTransaction();
            session.endSession();

            return res.status(400).json({

                success: false,

                message: "All required fields are missing."

            });

        }

        /*
        ===============================
        Generate From Gemini
        ===============================
        */

        const aiResponse = await generateQuiz({

            topic,

            difficulty,

            questionCount,

            questionTypes

        });

        const cleaned = cleanJson(aiResponse);

        const questions = JSON.parse(cleaned);

        if (!Array.isArray(questions) || questions.length === 0) {

            await session.abortTransaction();
            session.endSession();

            return res.status(400).json({

                success: false,

                message: "Gemini returned invalid questions."

            });

        }

        /*
====================================
Create Quiz
====================================
*/

const quiz = await Quiz.create(
    [{
        title,
        description,
        category,
        topic,
        difficulty,
        questionCount,
        questionTime,
        generatedByAI: true,
        status: "PUBLISHED",
        visibility: "PUBLIC",
        createdBy: req.user._id
    }],
    { session }
);

const createdQuiz = quiz[0];


/*
====================================
Prepare Questions
====================================
*/

const questionDocuments = [];

for (const q of questions) {

    // Prevent duplicate questions in same quiz
    const exists = questionDocuments.find(
        item =>
            item.question.trim().toLowerCase() ===
            q.question.trim().toLowerCase()
    );

    if (exists) {
        continue;
    }

    questionDocuments.push({

        quiz: createdQuiz._id,

        questionType: q.questionType,

        question: q.question,

        difficulty,

        marks: q.marks || 1,

        explanation: q.explanation || "",

        generatedByAI: true,

        /*
        MCQ
        */

        options: q.options
            ? q.options.map(option => ({ text: option }))
            : [],

        correctAnswerIndex:
            q.correctAnswerIndex ?? null,

        /*
        Coding
        */

        coding: q.coding || {},

        /*
        Long Answer
        */

        longAnswer: q.longAnswer || {},

        /*
        Fill Blank
        */

        fillBlank: q.fillBlank || {},

        /*
        True False
        */

        trueFalse: q.trueFalse || {}

    });

}

/*
====================================
Save Questions
====================================
*/

await Question.insertMany(

    questionDocuments,

    {

        session

    }

);

/*
====================================
Commit Transaction
====================================
*/

await session.commitTransaction();

session.endSession();

/*
====================================
Success Response
====================================
*/

return res.status(201).json({

    success: true,

    message: "AI Quiz Generated Successfully",

    quiz: createdQuiz,

    totalQuestions: questionDocuments.length

});

    }

    catch (error) {

    await session.abortTransaction();

    session.endSession();

    console.error(error);

    return res.status(500).json({

        success: false,

        message: error.message

    });

}

};