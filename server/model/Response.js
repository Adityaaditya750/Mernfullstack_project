const mongoose = require("mongoose");

/*
=====================================
Single Answer Schema
=====================================
*/

const answerSchema = new mongoose.Schema({

    question: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Question",
        required: true
    },

    questionType: {
        type: String,
        enum: [
            "MCQ",
            "CODING",
            "LONG",
            "TRUE_FALSE",
            "FILL",
            "IMAGE"
        ],
        required: true
    },

    /*
    ==========================
    MCQ
    ==========================
    */

    selectedOption: {
        type: Number,
        default: null
    },

    /*
    ==========================
    Coding
    ==========================
    */

    codingAnswer: {
        type: String,
        default: ""
    },

    codingLanguage: {
        type: String,
        default: ""
    },

    /*
    ==========================
    Long Answer
    ==========================
    */

    longAnswer: {
        type: String,
        default: ""
    },

    /*
    ==========================
    Fill Blank
    ==========================
    */

    fillBlankAnswer: {
        type: String,
        default: ""
    },

    /*
    ==========================
    True / False
    ==========================
    */

    trueFalseAnswer: {
        type: Boolean,
        default: null
    },

    /*
    ==========================
    Result
    ==========================
    */

    obtainedMarks: {
        type: Number,
        default: 0
    },

    maxMarks: {
        type: Number,
        default: 1
    },

    isCorrect: {
        type: Boolean,
        default: false
    },

    evaluatedByAI: {
        type: Boolean,
        default: false
    },

    aiFeedback: {
        type: String,
        default: ""
    },

    /*
    ==========================
    Analytics
    ==========================
    */

    timeTaken: {
        type: Number,
        default: 0
    },

    submittedAt: {
        type: Date,
        default: Date.now
    }

}, { _id: false });

/*
=====================================
Response Schema
=====================================
*/

const responseSchema = new mongoose.Schema(

{

    /*
    =====================================
    Quiz Information
    =====================================
    */

    quiz: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Quiz",
        required: true
    },

    room: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Room",
        default: null
    },

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    /*
    =====================================
    User Answers
    =====================================
    */

    answers: [answerSchema],

    /*
    =====================================
    Statistics
    =====================================
    */

    totalQuestions: {
        type: Number,
        default: 0
    },

    attemptedQuestions: {
        type: Number,
        default: 0
    },

    skippedQuestions: {
        type: Number,
        default: 0
    },

    correctAnswers: {
        type: Number,
        default: 0
    },

    wrongAnswers: {
        type: Number,
        default: 0
    },

    /*
    =====================================
    Marks
    =====================================
    */

    totalMarks: {
        type: Number,
        default: 0
    },

    obtainedMarks: {
        type: Number,
        default: 0
    },

    percentage: {
        type: Number,
        default: 0
    },

    rank: {
        type: Number,
        default: 0
    },

    /*
    =====================================
    Time
    =====================================
    */

    quizDuration: {
        type: Number,
        default: 0
    },

    timeTaken: {
        type: Number,
        default: 0
    },

    remainingTime: {
        type: Number,
        default: 0
    },

    startedAt: {
        type: Date,
        default: Date.now
    },

    submittedAt: {
        type: Date,
        default: null
    },

    /*
    =====================================
    Evaluation
    =====================================
    */

    evaluationStatus: {
        type: String,
        enum: [
            "PENDING",
            "PROCESSING",
            "COMPLETED"
        ],
        default: "PENDING"
    },

    /*
    =====================================
    Submission
    =====================================
    */

    submitted: {
        type: Boolean,
        default: false
    },

    autoSubmitted: {
        type: Boolean,
        default: false
    }

},

{

    timestamps: true

}

);