
const mongoose = require("mongoose");

const quizSchema = new mongoose.Schema(
    {
        // Basic information
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200,
        },

        description: {
            type: String,
            default: "",
            trim: true,
            maxlength: 5000,
        },

        // Flexible categories for every student stream.
        // Examples: Mathematics, Commerce, History, Biology, Programming.
        category: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
            index: true,
        },

        topic: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200,
        },

        difficulty: {
            type: String,
            enum: ["Easy", "Medium", "Hard"],
            default: "Easy",
        },

        // Quiz configuration
        questionCount: {
            type: Number,
            required: true,
            min: 1,
            max: 500,
        },

        // Existing field retained for compatibility.
        quizDuration: {
            type: Number,
            required: true,
            default: 20,
            min: 1,
            max: 600,
        },

        // Older controller code uses questionTime.
        questionTime: {
            type: Number,
            default: 30,
            min: 1,
            max: 3600,
        },

        thumbnail: {
            type: String,
            default: "",
        },

        generatedByAI: {
            type: Boolean,
            default: false,
        },

        // Permanent quizzes are stored in the quiz library.
        // Temporary quizzes can be associated with a battle.
        isTemporary: {
            type: Boolean,
            default: false,
            index: true,
        },

        temporaryRoom: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Room",
            default: null,
        },

        expiresAt: {
            type: Date,
            default: null,
        },

        // Scheduling window. Dates are stored in UTC.
        availableFrom: {
            type: Date,
            default: null,
            index: true,
        },

        availableUntil: {
            type: Date,
            default: null,
            index: true,
        },

        // Quiz behavior
        allowAnswerChange: {
            type: Boolean,
            default: true,
        },

        showLeaderboard: {
            type: Boolean,
            default: true,
        },

        showCorrectAnswers: {
            type: Boolean,
            default: true,
        },

        resultPublishMode: {
            type: String,
            enum: ["IMMEDIATE", "AFTER_END_TIME", "MANUAL"],
            default: "IMMEDIATE",
        },

        // PUBLIC: visible to eligible users.
        // PRIVATE: invitation code required.
        // ROOM_ONLY: used only in its associated battle.
        visibility: {
            type: String,
            enum: ["PUBLIC", "PRIVATE", "ROOM_ONLY"],
            default: "PUBLIC",
            index: true,
        },

        status: {
            type: String,
            enum: ["DRAFT", "PUBLISHED", "ARCHIVED"],
            default: "DRAFT",
            index: true,
        },

        // Only explicitly authorized creator APIs should reveal this.
        // select:false prevents ordinary queries from returning it.
        accessCode: {
            type: String,
            select: false,
            default: undefined,
        },

        // Creator and ownership
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

// Efficient public quiz catalogue queries.
quizSchema.index({
    status: 1,
    visibility: 1,
    availableFrom: 1,
    availableUntil: 1,
});

quizSchema.index({
    createdBy: 1,
    createdAt: -1,
});

module.exports =
    mongoose.models.Quiz ||
    mongoose.model("Quiz", quizSchema);
