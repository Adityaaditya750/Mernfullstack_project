const mongoose = require("mongoose");

const quizSchema = new mongoose.Schema(

{

    /*
    ====================================
    Basic Information
    ====================================
    */

    title: {
        type: String,
        required: true,
        trim: true
    },

    description: {
        type: String,
        default: ""
    },

    category: {
        type: String,
        required: true,
        enum: [
            "Programming",
            "Database",
            "Web Development",
            "AI & ML",
            "Networking",
            "Operating System",
            "Aptitude",
            "General Knowledge",
            "Others"
        ]
    },

    topic: {
        type: String,
        required: true
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

    /*
    ====================================
    Quiz Configuration
    ====================================
    */

    questionCount: {
        type: Number,
        required: true
    },

    quizDuration: {
        type: Number,
        required: true,
        default: 20 // Minutes
    },

    thumbnail: {
        type: String,
        default: ""
    },

    generatedByAI: {
        type: Boolean,
        default: false
    },

    /*
    ====================================
    Availability
    ====================================
    */

    availableFrom: {
        type: Date,
        default: null
    },

    availableUntil: {
        type: Date,
        default: null
    },

    /*
    ====================================
    Quiz Settings
    ====================================
    */

    allowAnswerChange: {
        type: Boolean,
        default: true
    },

    showLeaderboard: {
        type: Boolean,
        default: true
    },

    showCorrectAnswers: {
        type: Boolean,
        default: true
    },

    resultPublishMode: {
        type: String,
        enum: [
            "IMMEDIATE",
            "AFTER_END_TIME",
            "MANUAL"
        ],
        default: "IMMEDIATE"
    },

    /*
    ====================================
    Visibility
    ====================================
    */

    visibility: {
        type: String,
        enum: [
            "PUBLIC",
            "PRIVATE",
            "ROOM_ONLY"
        ],
        default: "PUBLIC"
    },

    /*
    ====================================
    Status
    ====================================
    */

    status: {
        type: String,
        enum: [
            "DRAFT",
            "PUBLISHED"
        ],
        default: "DRAFT"
    },

    /*
    ====================================
    Creator
    ====================================
    */

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }

},

{

    timestamps: true

}

);

module.exports =

mongoose.models.Quiz ||

mongoose.model("Quiz", quizSchema);