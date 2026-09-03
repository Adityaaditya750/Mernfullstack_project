
const {

    startTimer,

    stopTimer

} = require("./timer");
const {

    joinBattleService,

    leaveBattleService,

    startBattleService,

    nextQuestionService,

    endBattleService,

    submitAnswerService,

    getLeaderboardService

} = require("../service/battleService");

module.exports = (io, socket) => {

    /*
    ====================================
    Join Room
    ====================================
    */

    socket.on("join-room", async (data) => {

        try {

            const { roomCode, userId } = data;

            const room = await joinBattleService(

                roomCode,

                userId

            );

            socket.join(roomCode);

            io.to(roomCode).emit(

                "room-updated",

                room

            );

        }

        catch (error) {

            socket.emit("error", {

                message: error.message

            });

        }

    });

    /*
    ====================================
    Leave Room
    ====================================
    */

    socket.on("leave-room", async (data) => {

        try {

            const {

                roomId,

                roomCode,

                userId

            } = data;

            const room = await leaveBattleService(

                roomId,

                userId

            );

            socket.leave(roomCode);

            io.to(roomCode).emit(

                "room-updated",

                room

            );

        }

        catch (error) {

            socket.emit("error", {

                message: error.message

            });

        }

    });

/*
====================================
Start Battle
====================================
*/

socket.on("start-battle", async (data) => {

    try {

        const { roomId } = data;

        const room = await startBattleService(roomId);

        io.to(room.roomCode).emit(

            "battle-started",

            room

        );

        /*
        ====================================
        Start Question Timer
        ====================================
        */

        const Question = require("../model/Question");

let duration = 30;

if (room.timerMode === "QUESTION") {

    const question = await Question.findOne({

        quiz: room.quiz

    })
    .sort({ createdAt: 1 })
    .skip(room.currentQuestion);

    duration = question.timeLimit;

}

else {

    duration = room.remainingTime;

}

startTimer(

    io,

    room.roomCode,

    duration,

    () => {

        io.to(room.roomCode).emit(

            "timer-ended"

        );

    }

);

    }

    catch (error) {

        socket.emit("error", {

            message: error.message

        });

    }

});
    /*
====================================
Next Question
====================================
*/

socket.on("next-question", async (data) => {

    try {

        const { roomId } = data;

        const result = await nextQuestionService(roomId);

        if (result.completed) {

            io.to(result.room.roomCode).emit(

                "battle-ended"

            );

            return;

        }

        io.to(result.room.roomCode).emit(

            "next-question",

            result.room

        );

        const Question = require("../model/Question");

let duration = 30;

if (result.room.timerMode === "QUESTION") {

    const question = await Question.findOne({

        quiz: result.room.quiz

    })
    .sort({ createdAt: 1 })
    .skip(result.room.currentQuestion);

    duration = question.timeLimit;

}

else {

    duration = result.room.remainingTime;

}

startTimer(

    io,

    result.room.roomCode,

    duration,

    () => {

        io.to(result.room.roomCode).emit(

            "timer-ended"

        );

    }

);

    }

    catch (error) {

        socket.emit("error", {

            message: error.message

        });

    }

});
    /*
    ====================================
    Submit Answer
    ====================================
    */

    socket.on("submit-answer", async (data) => {

        try {

            const {

                roomId,

                userId,

                obtainedMarks

            } = data;

            await submitAnswerService(

                roomId,

                userId,

                obtainedMarks

            );

            const leaderboard =

                await getLeaderboardService(

                    roomId

                );

            const room = await require("../model/Room").findById(roomId);

io.to(room.roomCode).emit(

    "leaderboard-updated",

    leaderboard

);

        }

        catch (error) {

            socket.emit("error", {

                message: error.message

            });

        }

    });

    /*
    ====================================
    End Battle
    ====================================
    */

    socket.on("end-battle", async (data) => {

        try {

            const { roomId } = data;

            const room = await endBattleService(

                roomId

            );

            io.to(room.roomCode).emit(

                "battle-ended",

                room

            );

        }

        catch (error) {

            socket.emit("error", {

                message: error.message

            });

        }

    });

};