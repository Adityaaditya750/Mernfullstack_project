const Question = require("../model/Question");
const Quiz = require("../model/Quiz");

const attemptQuestionFields = [
    "questionType",
    "question",
    "difficulty",
    "marks",
    "image",
    "options",
    "coding.language",
    "coding.starterCode",
    "coding.constraints",
    "longAnswer.minimumWords"
].join(" ");

/*
=====================================
Create Question
=====================================
*/

exports.createQuestion = async (req, res) => {

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

            trueFalse

        } = req.body;

        // Check Quiz Exists

        const quiz = await Quiz.findById(quizId);

        if (!quiz) {

            return res.status(404).json({

                success: false,

                message: "Quiz not found"

            });

        }

        const newQuestion = await Question.create({

            quiz: quizId,

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

            generatedByAI: false

        });

        res.status(201).json({

            success: true,

            message: "Question Created",

            question: newQuestion

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
=====================================
Get All Questions of Quiz
=====================================
*/

exports.getQuestions = async (req, res) => {

    try {

        const questionQuery = Question.find({
            quiz: req.params.quizId
        });

        if (req.user.role !== "admin") {
            questionQuery.select(attemptQuestionFields);
        }

        const questions = await questionQuery.sort({ createdAt: 1 });

        res.json({

            success: true,

            total: questions.length,

            questions

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

exports.getAttemptQuestions = async (req, res) => {

    try {

        const questions = await Question.find({
            quiz: req.params.quizId
        })
        .select(attemptQuestionFields)
        .sort({ createdAt: 1 })
        .lean();

        return res.status(200).json({
            success: true,
            total: questions.length,
            questions
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

/*
=====================================
Update Question
=====================================
*/

exports.updateQuestion = async (req, res) => {

    try {

        const question = await Question.findByIdAndUpdate(

            req.params.questionId,

            req.body,

            {

                new: true

            }

        );

        if (!question) {

            return res.status(404).json({

                success: false,

                message: "Question Not Found"

            });

        }

        res.json({

            success: true,

            message: "Question Updated",

            question

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
=====================================
Delete Question
=====================================
*/

exports.deleteQuestion = async (req, res) => {

    try {

        const deleted = await Question.findByIdAndDelete(

            req.params.questionId

        );

        if (!deleted) {

            return res.status(404).json({

                success: false,

                message: "Question Not Found"

            });

        }

        res.json({

            success: true,

            message: "Question Deleted"

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};