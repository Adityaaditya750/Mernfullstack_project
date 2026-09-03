const Response = require("../model/Response");
const Quiz = require("../model/Quiz");
const Question = require("../model/Question");
const Room = require("../model/Room");

const {
    evaluateAnswer
} = require("../service/evaluationService");

exports.startQuiz = async (req, res) => {

    try {

        const {

            quizId,
            roomId

        } = req.body;

        /*
        =====================================
        Check Quiz
        =====================================
        */

        const quiz = await Quiz.findById(quizId);

        if (!quiz) {

            return res.status(404).json({

                success: false,

                message: "Quiz not found"

            });

        }

        /*
        =====================================
        Check Quiz Has Questions
        =====================================
        */

        const questions = await Question.find({
    quiz: quizId
}).select("marks");

const totalQuestions = questions.length;

const totalQuizMarks = questions.reduce(
    (total, question) => total + question.marks,
    0
);

        if (totalQuestions === 0) {

            return res.status(400).json({

                success: false,

                message: "Quiz has no questions."

            });

        }

        /*
        =====================================
        Battle Mode
        =====================================
        */

        if (roomId) {

            const room = await Room.findById(roomId);

            if (!room) {

                return res.status(404).json({

                    success: false,

                    message: "Room not found"

                });

            }

            if (!room.quiz) {

                return res.status(400).json({

                    success: false,

                    message: "No quiz selected for this room."

                });

            }

        }

        /*
        =====================================
        Already Started?
        =====================================
        */

        const alreadyStarted = await Response.findOne({

            quiz: quizId,

            room: roomId || null,

            user: req.user._id,

            submitted: false

        });

        if (alreadyStarted) {

            return res.status(200).json({

                success: true,

                message: "Quiz already started.",

                response: alreadyStarted

            });

        }

        /*
        =====================================
        Create Response
        =====================================
        */

       const response = await Response.create({

    quiz: quizId,

    room: roomId || null,

    user: req.user._id,

    answers: [],

    // IMPORTANT:
    // Total marks of ALL questions
    totalMarks: totalQuizMarks,

    obtainedMarks: 0,

    percentage: 0,

    startedAt: new Date(),

    submitted: false,

    autoSubmitted: false

});
        return res.status(201).json({

            success: true,

            message: "Quiz Started Successfully",

            response

        });

    }

    catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

/*
=====================================================
Submit Answer
=====================================================
*/

exports.submitAnswer = async (req, res) => {

    try {

        const {

            responseId,
            questionId,
            selectedOption,
            codingAnswer,
            codingLanguage,
            longAnswer,
            fillBlankAnswer,
            trueFalseAnswer,
            timeTaken

        } = req.body;

        /*
        =====================================
        Find Response
        =====================================
        */

        const response = await Response.findOne({

            _id: responseId,

            user: req.user._id

        });

        if (!response) {

            return res.status(404).json({

                success: false,

                message: "Response not found"

            });

        }

        /*
        =====================================
        Already Submitted?
        =====================================
        */

        if (response.submitted) {

            return res.status(400).json({

                success: false,

                message: "Quiz already submitted."

            });

        }

        /*
        =====================================
        Find Question
        =====================================
        */

        const question = await Question.findById(questionId);

        if (!question) {

            return res.status(404).json({

                success: false,

                message: "Question not found"

            });

        }

        /*
        =====================================
        Question belongs to Quiz?
        =====================================
        */

        if (question.quiz.toString() !== response.quiz.toString()) {

            return res.status(400).json({

                success: false,

                message: "Invalid question."

            });

        }

        /*
        =====================================
        Already Answered?
        =====================================
        */

        const exists = response.answers.find(

            answer =>

                answer.question.toString() === questionId

        );

        if (exists) {

            return res.status(400).json({

                success: false,

                message: "Question already submitted"

            });

        }

        /*
=====================================
Evaluate Answer
=====================================
*/

const evaluation = await evaluateAnswer(
    questionId,
    {
        selectedOption,
        codingAnswer,
        codingLanguage,
        longAnswer,
        fillBlankAnswer,
        trueFalseAnswer,
        timeTaken
    }
);

const obtainedMarks =
    evaluation.obtainedMarks || 0;

const isCorrect =
    evaluation.isCorrect || false;
        /*
        =====================================
        Update Score
        =====================================
        */

        response.obtainedMarks += obtainedMarks;

if (response.totalMarks > 0) {

    response.percentage = Number(
        (
            (response.obtainedMarks / response.totalMarks) * 100
        ).toFixed(2)
    );

}

        response.percentage = Number(

            (

                (response.obtainedMarks / response.totalMarks) * 100

            ).toFixed(2)

        );

        await response.save();

        return res.status(200).json({

            success: true,

            message: "Answer Submitted Successfully",

            response

        });

    }

    catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

};


/*
=====================================================
Finish Quiz
=====================================================
*/

/*
=====================================================
Finish Quiz
=====================================================
*/

exports.finishQuiz = async (req, res) => {

    try {

        const { responseId } = req.body;

        /*
        =====================================
        Find Response
        =====================================
        */

        const response = await Response.findOne({

            _id: responseId,

            user: req.user._id

        });

        if (!response) {

            return res.status(404).json({

                success: false,

                message: "Response not found"

            });

        }

        /*
        =====================================
        Already Submitted?
        =====================================
        */

        if (response.submitted) {

            return res.status(400).json({

                success: false,

                message: "Quiz already submitted."

            });

        }

        /*
        =====================================
        Finish Quiz
        =====================================
        */

        response.submitted = true;

        response.submittedAt = new Date();

        if (response.totalMarks > 0) {

            response.percentage = Number(

                (

                    (response.obtainedMarks / response.totalMarks) * 100

                ).toFixed(2)

            );

        }

        await response.save();

        return res.status(200).json({

            success: true,

            message: "Quiz Submitted Successfully",

            response

        });

    }

    catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

};
/*
=====================================================
Auto Submit Quiz
=====================================================
*/

/*
=====================================================
Auto Submit Quiz
=====================================================
*/

exports.autoSubmitQuiz = async (req, res) => {

    try {

        const { responseId } = req.body;

        /*
        =====================================
        Find Response
        =====================================
        */

        const response = await Response.findOne({

            _id: responseId,

            user: req.user._id

        });

        if (!response) {

            return res.status(404).json({

                success: false,

                message: "Response not found"

            });

        }

        /*
        =====================================
        Already Submitted?
        =====================================
        */

        if (response.submitted) {

            return res.status(400).json({

                success: false,

                message: "Quiz already submitted."

            });

        }

        /*
        =====================================
        Auto Submit
        =====================================
        */

        response.submitted = true;

        response.autoSubmitted = true;

        response.submittedAt = new Date();

        if (response.totalMarks > 0) {

            response.percentage = Number(

                (

                    (response.obtainedMarks / response.totalMarks) * 100

                ).toFixed(2)

            );

        }

        await response.save();

        return res.status(200).json({

            success: true,

            message: "Quiz Auto Submitted Successfully",

            response

        });

    }

    catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

};


/*
=====================================================
Get Result
=====================================================
*/

exports.getResult = async (req, res) => {

    try {

        const { responseId } = req.params;

        /*
        =====================================
        Find Result
        =====================================
        */

        const response = await Response.findOne({

            _id: responseId,

            user: req.user._id

        })
        .populate({

            path: "quiz",

            select: "title category topic difficulty questionCount"

        })
        .populate({

            path: "user",

            select: "name email"

        })
        .populate({

            path: "answers.question",

            select: "question questionType options explanation marks"

        });

        if (!response) {

            return res.status(404).json({

                success: false,

                message: "Result not found"

            });

        }

        /*
        =====================================
        Result Summary
        =====================================
        */

        const totalQuestions =
    await Question.countDocuments({
        quiz: response.quiz._id
    });

const attended =
    response.answers.length;

const unanswered =
    totalQuestions - attended;

const correctAnswers =
    response.answers.filter(
        answer => answer.isCorrect
    ).length;

const wrongAnswers =
    attended - correctAnswers;

        return res.status(200).json({

            success: true,

            result: {

                quiz: response.quiz,

                user: response.user,

                totalQuestions,

attended,

unanswered,

correctAnswers,

wrongAnswers,

                obtainedMarks: response.obtainedMarks,

                totalMarks: response.totalMarks,

                percentage: response.percentage,

                submitted: response.submitted,

                autoSubmitted: response.autoSubmitted,

                startedAt: response.startedAt,

                submittedAt: response.submittedAt,

                answers: response.answers

            }

        });

    }

    catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

};