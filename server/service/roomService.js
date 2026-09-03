const Room = require("../model/Room");
const Quiz = require("../model/Quiz");

/*
====================================
Create Practice Room
====================================
*/

exports.createPracticeRoom = async (userId, quizId) => {

    const quiz = await Quiz.findById(quizId);

    if (!quiz) {

        throw new Error("Quiz not found");

    }

    const room = await Room.create({

        roomName: "Practice Room",

        host: userId,

        quiz: quizId,

        roomType: "Private",

        gameMode: "PRACTICE",

        quizSource: "DATABASE",

        maxPlayers: 1,

        totalQuestions: quiz.questionCount,

        quizDuration: quiz.questionCount * quiz.questionTime,

        players: [

            {

                user: userId,

                isHost: true,

                isReady: true

            }

        ]

    });

    return room;

};

/*
====================================
Create Battle Room
====================================
*/

exports.createBattleRoom = async (

    userId,

    roomName,

    roomType,

    maxPlayers,

    timerMode,

    battleTime

) => {

    const room = await Room.create({

        roomName,

        roomType,

        gameMode: "BATTLE",

        host: userId,

        maxPlayers,

        timerMode,

        battleTime,

        remainingTime:

            timerMode === "QUIZ"

                ? battleTime

                : 0,

        players: [

            {

                user: userId,

                isHost: true,

                isReady: true

            }

        ]

    });

    return room;

};