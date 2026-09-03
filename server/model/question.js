const mongoose = require("mongoose");

/*
=====================================
Option Schema
=====================================
*/

const optionSchema = new mongoose.Schema({

    text: {
        type: String,
        required: true
    }

}, {
    _id: false
});

/*
=====================================
Coding Test Case Schema
=====================================
*/

const testCaseSchema = new mongoose.Schema({

    input: {
        type: String,
        default: ""
    },

    expectedOutput: {
        type: String,
        required: true
    },

    /*
    Visible test case:
    Student can see it.

    Hidden test case:
    Student cannot see it.
    */

    isHidden: {
        type: Boolean,
        default: true
    }

}, {
    _id: false
});

/*
=====================================
Question Schema
=====================================
*/

const questionSchema = new mongoose.Schema({

    /*
    =================================
    Quiz
    =================================
    */

    quiz: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Quiz",
        required: true
    },

    /*
    =================================
    Basic Information
    =================================
    */

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

    question: {
        type: String,
        required: true,
        trim: true
    },

    difficulty: {
        type: String,
        enum: [
            "Easy",
            "Medium",
            "Hard"
        ],
        default: "Easy"
    },

    marks: {
        type: Number,
        default: 1,
        min: 0
    },

    explanation: {
        type: String,
        default: ""
    },

    image: {
        type: String,
        default: ""
    },

    generatedByAI: {
        type: Boolean,
        default: false
    },

    /*
    =================================
    MCQ
    =================================
    */

    options: [
        optionSchema
    ],

    correctAnswerIndex: {
        type: Number,
        default: null
    },

    /*
    =================================
    Coding
    =================================
    */

    coding: {

        language: {
            type: String,
            default: ""
        },

        starterCode: {
            type: String,
            default: ""
        },

        /*
        Reference / Expected Solution

        Used by Gemini to understand
        the intended solution.

        Student does NOT need to
        write the same code.
        */

        solutionCode: {
            type: String,
            default: ""
        },

        /*
        Question requirements / restrictions.

        Example:

        [
            "Do not define a function",
            "Use a loop",
            "Take input from the user"
        ]
        */

        constraints: {
            type: [String],
            default: []
        },

        /*
        Test Cases

        Every coding question can have
        any number of test cases.

        Example:

        testCases: [
            {
                input: "hello",
                expectedOutput: "olleh",
                isHidden: false
            },
            {
                input: "javascript",
                expectedOutput: "tpircsavaj",
                isHidden: true
            }
        ]
        */

        testCases: [
            testCaseSchema
        ]

    },

    /*
    =================================
    Long Answer
    =================================
    */

    longAnswer: {

        minimumWords: {
            type: Number,
            default: 100
        },

        expectedAnswer: {
            type: String,
            default: ""
        }

    },

    /*
    =================================
    Fill Blank
    =================================
    */

    fillBlank: {

        answer: {
            type: String,
            default: ""
        }

    },

    /*
    =================================
    True / False
    =================================
    */

    trueFalse: {

        answer: {
            type: Boolean,
            default: false
        }

    }

}, {

    timestamps: true

});

module.exports =
    mongoose.models.Question ||
    mongoose.model("Question", questionSchema);
    