const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
{
    roomName:{
        type:String,
        required:true,
        trim:true
    },

    roomCode:{
        type:String,
        unique:true
    },

    host:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },

    quiz:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Quiz"
    },

    players:[
        {
            user:{
                type:mongoose.Schema.Types.ObjectId,
                ref:"User"
            },

            responseId:{
                type:mongoose.Schema.Types.ObjectId,
                ref:"Response",
                default:null
            },

            joinedAt:{
                type:Date,
                default:Date.now
            },

            score:{
                type:Number,
                default:0
            },

            isReady:{
                type:Boolean,
                default:false
            },

            isHost:{
                type:Boolean,
                default:false
            }
        }
    ],

    maxPlayers:{
        type:Number,
        default:4
    },

    roomType:{
        type:String,
        enum:["Public","Private"],
        default:"Private"
    },

    status:{
        type:String,
        enum:["Waiting","Started","Completed"],
        default:"Waiting"
    },

    // 👇 Add these fields here
    currentQuestion:{
        type:Number,
        default:-1
    },
    currentQuestionStartTime:{
    type:Date,
    default:null
},

    startedAt:{
        type:Date,
        default:null
    },

quizEndTime: {
    type: Date,
    default: null
},

    endedAt:{
        type:Date,
        default:null
    },
    isQuizStarted: {
    type: Boolean,
    default: false
},

totalQuestions: {
    type: Number,
    default: 0
},

quizDuration: {
    type: Number,
    default: 0
},

timerMode: {
    type: String,
    enum: ["QUESTION", "QUIZ"],
    default: "QUIZ"
},

battleTime: {
    type: Number,
    default: 0
},

remainingTime: {
    type: Number,
    default: 0
},

isQuizEnded: {
    type: Boolean,
    default: false
},
allowAnswerChange:{
    type:Boolean,
    default:true
},
    winner:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    }

},
{
    timestamps:true
});

roomSchema.pre("save", function(){

    if(!this.roomCode){

        this.roomCode = Math.random()
            .toString(36)
            .substring(2,8)
            .toUpperCase();
    }

    
});

module.exports =
mongoose.models.Room ||
mongoose.model("Room", roomSchema);