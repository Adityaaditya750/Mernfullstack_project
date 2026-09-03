const Room = require("../model/Room");
const Question = require("../model/Question");

/*
====================================
Start Battle
====================================
*/

exports.startBattleService = async (roomId) => {

    const room = await Room.findById(roomId);

    if (!room) {

        throw new Error("Room Not Found");

    }

    room.status = "Started";

    room.isQuizStarted = true;

    room.currentQuestion = 0;

    room.currentQuestionStartTime = new Date();

    room.startedAt = new Date();

    await room.save();

    return room;

};

/*
====================================
Next Question
====================================
*/

exports.nextQuestionService = async (roomId) => {

    const room = await Room.findById(roomId);

    if (!room) {

        throw new Error("Room Not Found");

    }

    const totalQuestions = await Question.countDocuments({

        quiz: room.quiz

    });

    if (room.currentQuestion + 1 >= totalQuestions) {

        return {

            completed: true,

            room

        };

    }

    room.currentQuestion += 1;

    room.currentQuestionStartTime = new Date();

    await room.save();

    return {

        completed: false,

        room

    };

};

/*
====================================
End Battle
====================================
*/

exports.endBattleService = async (roomId) => {

    const room = await Room.findById(roomId);

    if (!room) {

        throw new Error("Room Not Found");

    }

    room.status = "Completed";

    room.isQuizEnded = true;

    room.isQuizStarted = false;

    room.endedAt = new Date();

    await room.save();

    return room;

};

/*
====================================
Join Battle
====================================
*/

exports.joinBattleService = async (roomCode, userId) => {

    const Room = require("../model/Room");

    const room = await Room.findOne({ roomCode });

    if (!room) {

        throw new Error("Room Not Found");

    }

    const alreadyJoined = room.players.find(

        player => player.user.toString() === userId.toString()

    );

    if (!alreadyJoined) {

        room.players.push({

            user: userId,

            isHost: false,

            isReady: false,

            score: 0

        });

        await room.save();

    }

    return room;

};

/*
====================================
Leave Battle
====================================
*/

exports.leaveBattleService = async (roomId, userId) => {

    const Room = require("../model/Room");

    const room = await Room.findById(roomId);

    if (!room) {

        throw new Error("Room Not Found");

    }

    room.players = room.players.filter(

        player => player.user.toString() !== userId.toString()

    );

    await room.save();

    return room;

};


/*
====================================
Leaderboard
====================================
*/

exports.getLeaderboardService = async (roomId) => {

    const Room = require("../model/Room");

    const room = await Room.findById(roomId)
        .populate("players.user", "name email");

    if (!room) {

        throw new Error("Room Not Found");

    }

    const leaderboard = [...room.players].sort(

        (a, b) => b.score - a.score

    );

    return leaderboard;

};

/*
====================================
Submit Answer
====================================
*/

exports.submitAnswerService = async (

    roomId,

    userId,

    obtainedMarks

) => {

    const Room = require("../model/Room");

    const room = await Room.findById(roomId);

    if (!room) {

        throw new Error("Room Not Found");

    }

    const player = room.players.find(

        p => p.user.toString() === userId.toString()

    );

    if (!player) {

        throw new Error("Player Not Found");

    }

    player.score += obtainedMarks;

    await room.save();

    return player;

};