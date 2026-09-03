const Question = require("../model/Question");
const Quiz = require("../model/Quiz");

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

        const questions = await Question.find({

            quiz: req.params.quizId

        });

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