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
    totalQuestions,
    quizDuration: Number(quiz.quizDuration) || 20,
    durationSeconds: (Number(quiz.quizDuration) || 20) * 60,

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

response.answers.push({
    question: question._id,
    questionType: question.questionType,
    selectedOption: Number.isInteger(selectedOption) ? selectedOption : null,
    codingAnswer: codingAnswer || "",
    codingLanguage: codingLanguage || "",
    longAnswer: longAnswer || "",
    fillBlankAnswer: fillBlankAnswer || "",
    trueFalseAnswer: typeof trueFalseAnswer === "boolean" ? trueFalseAnswer : null,
    obtainedMarks,
    maxMarks: question.marks,
    isCorrect,
    evaluatedByAI: evaluation.evaluatedByAI || false,
    aiFeedback: evaluation.aiFeedback || "",
    timeTaken: evaluation.timeTaken ?? timeTaken ?? 0
});

response.attemptedQuestions = response.answers.length;
response.correctAnswers = response.answers.filter(answer => answer.isCorrect).length;
response.wrongAnswers = response.attemptedQuestions - response.correctAnswers;

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

exports.completeQuiz = async (req, res) => {

    try {

        const { responseId, answers = [] } = req.body;

        if (!Array.isArray(answers)) {

            return res.status(400).json({
                success: false,
                message: "Answers must be provided as a list."
            });

        }

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

        if (response.submitted) {

            return res.status(200).json({
                success: true,
                response
            });

        }

        const room = response.room
            ? await Room.findById(response.room)
            : null;

        if (response.room && (!room || room.status !== "Started")) {

            return res.status(400).json({
                success: false,
                message: "This battle is no longer accepting answers."
            });

        }

        const submissionTime = new Date();
        const submittedQuestionIds = new Set(
            response.answers.map(answer => answer.question.toString())
        );

        for (const submittedAnswer of answers) {

            if (!submittedAnswer || typeof submittedAnswer.questionId !== "string") {

                return res.status(400).json({
                    success: false,
                    message: "Each answer must include a valid question ID."
                });

            }

            const question = await Question.findOne({
                _id: submittedAnswer.questionId,
                quiz: response.quiz
            });

            if (!question) {

                return res.status(400).json({
                    success: false,
                    message: "An answer belongs to a different quiz."
                });

            }

            if (submittedQuestionIds.has(question._id.toString())) {
                continue;
            }

            const evaluation = await evaluateAnswer(question._id, submittedAnswer);

            response.answers.push({
                question: question._id,
                questionType: question.questionType,
                selectedOption: Number.isInteger(submittedAnswer.selectedOption)
                    ? submittedAnswer.selectedOption
                    : null,
                codingAnswer: submittedAnswer.codingAnswer || "",
                codingLanguage: submittedAnswer.codingLanguage || "",
                longAnswer: submittedAnswer.longAnswer || "",
                fillBlankAnswer: submittedAnswer.fillBlankAnswer || "",
                trueFalseAnswer: typeof submittedAnswer.trueFalseAnswer === "boolean"
                    ? submittedAnswer.trueFalseAnswer
                    : null,
                obtainedMarks: evaluation.obtainedMarks || 0,
                maxMarks: question.marks,
                isCorrect: evaluation.isCorrect || false,
                evaluatedByAI: evaluation.evaluatedByAI || false,
                aiFeedback: evaluation.aiFeedback || "",
                timeTaken: evaluation.timeTaken || 0
            });

            submittedQuestionIds.add(question._id.toString());

        }

        response.totalQuestions = response.totalQuestions
            || await Question.countDocuments({ quiz: response.quiz });
        response.attemptedQuestions = response.answers.length;
        response.skippedQuestions = Math.max(
            0,
            response.totalQuestions - response.attemptedQuestions
        );
        response.correctAnswers = response.answers.filter(answer => answer.isCorrect).length;
        response.wrongAnswers = response.attemptedQuestions - response.correctAnswers;
        response.obtainedMarks = response.answers.reduce(
            (total, answer) => total + answer.obtainedMarks,
            0
        );
        response.percentage = response.totalMarks > 0
            ? Number(((response.obtainedMarks / response.totalMarks) * 100).toFixed(2))
            : 0;
        response.submitted = true;
        response.submittedAt = submissionTime;

        const durationSeconds = response.durationSeconds
            || (Number((await Quiz.findById(response.quiz).select("quizDuration"))?.quizDuration) || 20) * 60;
        const deadline = room?.quizEndTime
            || new Date(new Date(response.startedAt).getTime() + durationSeconds * 1000);
        response.autoSubmitted = submissionTime >= deadline;

        await response.save();

        if (room) {

            const player = room.players.find(
                item => item.user.toString() === req.user._id.toString()
            );

            if (player) {
                player.score = response.obtainedMarks;
                await room.save();
            }

            const pendingResponses = await Response.countDocuments({
                room: room._id,
                submitted: false
            });

            if (pendingResponses === 0) {

                room.status = "Completed";
                room.isQuizStarted = false;
                room.isQuizEnded = true;
                room.endedAt = new Date();

                const rankedPlayers = [...room.players].sort(
                    (left, right) => right.score - left.score
                );

                room.winner = rankedPlayers[0]?.user || null;
                await room.save();

            }

        }

        return res.status(200).json({
            success: true,
            response
        });

    } catch (error) {

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

            path: "room",

            select: "roomName status endedAt quizEndTime"

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

                serverNow: new Date(),

                quizDuration: response.quizDuration,

                durationSeconds: response.durationSeconds,

                room: response.room,

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

/*
=====================================================
Get Current User's Submitted Quiz Results
=====================================================
*/

exports.getMyResults = async (req, res) => {

    try {

        const results = await Response.find({

            user: req.user._id,

            submitted: true

        })
        .select("quiz room obtainedMarks totalMarks percentage submittedAt autoSubmitted")
        .populate({

            path: "quiz",

            select: "title category topic difficulty"

        })
        .populate({

            path: "room",

            select: "roomName"

        })
        .sort({ submittedAt: -1 })
        .limit(100)
        .lean();

        return res.status(200).json({

            success: true,

            results

        });

    }

    catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

};