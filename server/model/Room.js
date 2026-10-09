
const mongoose = require("mongoose");
const crypto = require("crypto");

/* =========================================
   PLAYER SCHEMA
========================================= */

const playerSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        responseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Response",
            default: null,
        },

        joinedAt: {
            type: Date,
            default: Date.now,
        },

        score: {
            type: Number,
            default: 0,
            min: 0,
        },

        isReady: {
            type: Boolean,
            default: false,
        },

        isHost: {
            type: Boolean,
            default: false,
        },

        // Player removal is tracked per player.
        isRemoved: {
            type: Boolean,
            default: false,
        },

        removedAt: {
            type: Date,
            default: null,
        },

        removedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    {
        _id: false,
    }
);

/* =========================================
   ROOM SCHEMA
========================================= */

const roomSchema = new mongoose.Schema(
    {
        roomName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },

        // Public rooms can share their room code.
        // Private rooms require the code to join.
        roomCode: {
            type: String,
            unique: true,
            sparse: true,
            index: true,
        },

        host: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        quiz: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Quiz",
            default: null,
        },

        players: {
            type: [playerSchema],
            default: [],
        },

        maxPlayers: {
            type: Number,
            default: 4,
            enum: [2, 3, 4, 5, 6, 8],
        },

        roomType: {
            type: String,
            enum: ["Public", "Private"],
            default: "Private",
            index: true,
        },

        status: {
            type: String,
            enum: ["Waiting", "Started", "Completed"],
            default: "Waiting",
            index: true,
        },

        gameMode: {
            type: String,
            enum: ["PRACTICE", "BATTLE"],
            default: "BATTLE",
        },

        quizSource: {
            type: String,
            enum: ["DATABASE", "AI"],
            default: "DATABASE",
        },

        /* =====================================
           SHARED BATTLE TIMER
        ===================================== */

        timerMode: {
            type: String,
            enum: ["QUESTION", "QUIZ"],
            default: "QUIZ",
        },

        // Configured total battle time in seconds.
        battleTime: {
            type: Number,
            default: 0,
            min: 0,
        },

        // Remaining time in seconds; updated as needed.
        remainingTime: {
            type: Number,
            default: 0,
            min: 0,
        },

        startedAt: {
            type: Date,
            default: null,
        },

        // Server-controlled deadline for the battle.
        quizEndTime: {
            type: Date,
            default: null,
            index: true,
        },

        endedAt: {
            type: Date,
            default: null,
        },

        /* =====================================
           QUESTION PROGRESSION
        ===================================== */

        currentQuestion: {
            type: Number,
            default: -1,
            min: -1,
        },

        currentQuestionStartTime: {
            type: Date,
            default: null,
        },

        // A fixed sequence shared by all players.
        questionOrder: {
            type: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Question",
                },
            ],
            default: [],
        },

        isQuizStarted: {
            type: Boolean,
            default: false,
        },

        isQuizEnded: {
            type: Boolean,
            default: false,
        },

        totalQuestions: {
            type: Number,
            default: 0,
            min: 0,
        },

        // Duration in minutes, if used by your existing quiz logic.
        quizDuration: {
            type: Number,
            default: 0,
            min: 0,
        },

        allowAnswerChange: {
            type: Boolean,
            default: true,
        },

        /* =====================================
           RESULTS
        ===================================== */

        winner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

/* =========================================
   ROOM CODE GENERATION
========================================= */

// Generate a room code automatically when one is not provided.
// Controllers/services should still handle duplicate-key errors.
roomSchema.pre("save", function () {
    if (!this.roomCode) {
        this.roomCode = crypto
            .randomBytes(5)
            .toString("hex")
            .toUpperCase();
    }
});

/* =========================================
   INDEXES
========================================= */

roomSchema.index({
    roomType: 1,
    status: 1,
    createdAt: -1,
});

roomSchema.index({
    host: 1,
    status: 1,
});

roomSchema.index({
    quizEndTime: 1,
    status: 1,
});

/* =========================================
   EXPORT MODEL
========================================= */

module.exports =
    mongoose.models.Room ||
    mongoose.model("Room", roomSchema);
