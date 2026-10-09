
const mongoose = require("mongoose");

const optionSchema = new mongoose.Schema(
    {
        text: {
            type: String,
            required: true,
            trim: true,
        },
    },
    { _id: false }
);

const testCaseSchema = new mongoose.Schema(
    {
        input: {
            type: String,
            default: "",
        },

        expectedOutput: {
            type: String,
            required: true,
        },

        isHidden: {
            type: Boolean,
            default: true,
        },
    },
    { _id: false }
);

const questionSchema = new mongoose.Schema(
    {
        quiz: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Quiz",
            required: true,
            index: true,
        },

        questionType: {
            type: String,
            enum: [
                "MCQ",
                "CODING",
                "LONG",
                "TRUE_FALSE",
                "FILL",
                "IMAGE",
            ],
            required: true,
        },

        question: {
            type: String,
            required: true,
            trim: true,
        },

        difficulty: {
            type: String,
            enum: ["Easy", "Medium", "Hard"],
            default: "Easy",
        },

        marks: {
            type: Number,
            default: 1,
            min: 0,
        },

        explanation: {
            type: String,
            default: "",
        },

        image: {
            type: String,
            default: "",
        },

        generatedByAI: {
            type: Boolean,
            default: false,
        },

        // MCQ and image-choice questions
        options: {
            type: [optionSchema],
            default: [],
        },

        correctAnswerIndex: {
            type: Number,
            default: null,
            min: 0,
        },

        // Coding questions
        coding: {
            language: {
                type: String,
                default: "",
            },

            starterCode: {
                type: String,
                default: "",
            },

            solutionCode: {
                type: String,
                default: "",
                select: false,
            },

            constraints: {
                type: [String],
                default: [],
            },

            testCases: {
                type: [testCaseSchema],
                default: [],
            },
        },

        // Long-answer questions
        longAnswer: {
            minimumWords: {
                type: Number,
                default: 100,
                min: 0,
            },

            expectedAnswer: {
                type: String,
                default: "",
                select: false,
            },
        },

        // Fill-in-the-blank questions
        fillBlank: {
            answer: {
                type: String,
                default: "",
                select: false,
            },
        },

        // True/false questions
        trueFalse: {
            answer: {
                type: Boolean,
                default: false,
                select: false,
            },
        },
    },
    {
        timestamps: true,
    }
);

questionSchema.index({
    quiz: 1,
    createdAt: 1,
});

module.exports =
    mongoose.models.Question ||
    mongoose.model("Question", questionSchema);
