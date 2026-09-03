const Room = require("../model/Room");
const Quiz = require("../model/Quiz");
const Question = require("../model/Question");

const {

createPracticeRoom,

createBattleRoom

} = require("../service/roomService");

const {
    startBattleService,
    nextQuestionService,
    endBattleService
} = require("../service/battleService");

/*
====================================
Create Room
====================================
*/

exports.createRoom = async (req, res) => {

    try {

        const {

    gameMode,

    quizId,

    roomName,

    roomType,

    maxPlayers,

    timerMode,

    battleTime

} = req.body;

        let room;

        /*
        ====================================
        Practice
        ====================================
        */

        if (gameMode === "PRACTICE") {

            room = await createPracticeRoom(

                req.user._id,

                quizId

            );

        }

        /*
        ====================================
        Battle
        ====================================
        */

        else {

            room = await createBattleRoom(

    req.user._id,

    roomName,

    roomType,

    maxPlayers,

    timerMode,

    battleTime

);

        }

        res.status(201).json({

            success: true,

            room

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

/*
====================================
Join Room
====================================
*/

exports.joinRoom = async (req, res) => {

    try {

        const { roomCode } = req.body;

        const room = await Room.findOne({

            roomCode

        });

        if (!room) {

            return res.status(404).json({

                success: false,

                message: "Room Not Found"

            });

        }

        if (room.status !== "Waiting") {

            return res.status(400).json({

                success: false,

                message: "Quiz Already Started"

            });

        }

        const alreadyJoined = room.players.find(

            p => p.user.toString() === req.user._id.toString()

        );

        if (alreadyJoined) {

    return res.status(200).json({

        success:true,

        alreadyJoined:true,

        message:"You are already in this room.",

        room

    });

}

        if (room.players.length >= room.maxPlayers) {

            return res.status(400).json({

                success: false,

                message: "Room Full"

            });

        }

        room.players.push({

            user: req.user._id

        });

        await room.save();

        res.json({

            success: true,

            message: "Joined Successfully",

            room

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

/*
====================================
Get Room
====================================
*/

exports.getRoom = async (req, res) => {

    try {

        const room = await Room.findById(req.params.roomId)

            .populate("host", "name email")

            .populate("players.user", "name email")

            .populate("quiz");

        if (!room) {

            return res.status(404).json({

                success: false,

                message: "Room Not Found"

            });

        }

        res.json(room);

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

/*
====================================
Leave Room
====================================
*/

/*
====================================
Leave Room
====================================
*/

exports.leaveRoom = async (req, res) => {

    try {

        const { roomId } = req.params;

        const room = await Room.findById(roomId);

        if (!room) {

            return res.status(404).json({

                success: false,

                message: "Room Not Found"

            });

        }

        /*
        ====================================
        Check Player Exists
        ====================================
        */

        const player = room.players.find(

            p => p.user.toString() === req.user._id.toString()

        );

        if (!player) {

            return res.status(400).json({

                success: false,

                message: "You are not in this room."

            });

        }

        /*
        ====================================
        Remove Player
        ====================================
        */

        room.players = room.players.filter(

            p => p.user.toString() !== req.user._id.toString()

        );

        /*
        ====================================
        Host Left
        ====================================
        */

        if (room.host.toString() === req.user._id.toString()) {

            // No players left -> delete room

            if (room.players.length === 0) {

                await Room.findByIdAndDelete(roomId);

                return res.status(200).json({

                    success: true,

                    message: "Host left. Room deleted."

                });

            }

            // Make first player new host

            room.host = room.players[0].user;

            room.players[0].isHost = true;

        }

        await room.save();

        return res.status(200).json({

            success: true,

            message: "Left Room Successfully",

            room

        });

    }

    catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

};
/*
====================================
Toggle Ready
====================================
*/

exports.toggleReady = async (req, res) => {

    try {

        const room = await Room.findById(req.params.roomId);

        if (!room) {

            return res.status(404).json({
                success: false,
                message: "Room Not Found"
            });

        }

        const player = room.players.find(

            p => p.user.toString() === req.user._id.toString()

        );

        if (!player) {

            return res.status(404).json({

                success: false,

                message: "Player Not Found"

            });

        }

        player.isReady = !player.isReady;

        await room.save();

        res.json({

            success: true,

            message: player.isReady
                ? "Player Ready"
                : "Player Not Ready",

            room

        });

    }

    catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }
};

  /*
====================================
Start Room
====================================
*/

exports.startRoom = async (req, res) => {

    try {

        const room = await Room.findById(req.params.roomId)
            .populate("quiz");

        if (!room) {

            return res.status(404).json({

                success: false,

                message: "Room Not Found"

            });

        }

        /*
        ====================================
        Only Host Can Start
        ====================================
        */

        if (room.host.toString() !== req.user._id.toString()) {

            return res.status(403).json({

                success: false,

                message: "Only Host Can Start Quiz"

            });

        }

        /*
        ====================================
        Quiz Selected?
        ====================================
        */

        if (!room.quiz) {

            return res.status(400).json({

                success: false,

                message: "Please Select Quiz First"

            });

        }

        /*
        ====================================
        Everyone Ready?
        ====================================
        */

        const notReady = room.players.find(

            player => !player.isReady

        );

        if (notReady) {

            return res.status(400).json({

                success: false,

                message: "All Players Are Not Ready"

            });

        }

        /*
        ====================================
        Start Battle
        ====================================
        */

        const updatedRoom = await startBattleService(room._id);

        return res.status(200).json({

            success: true,

            message: "Battle Started Successfully",

            room: updatedRoom

        });

    }

    catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

};
/*
====================================
Select Quiz
====================================
*/

exports.selectQuiz = async (req, res) => {

    try {

        const { roomId } = req.params;
        const { quizId } = req.body;

        const room = await Room.findById(roomId);

        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Room Not Found"
            });
        }

        // Only Host Can Select Quiz
        if (room.host.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Only Host Can Select Quiz"
            });
        }

        const quiz = await Quiz.findById(quizId);

        if (!quiz) {
            return res.status(404).json({
                success: false,
                message: "Quiz Not Found"
            });
        }

        room.quiz = quiz._id;

        await room.save();

        res.status(200).json({
            success: true,
            message: "Quiz Selected Successfully",
            room
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

/*
====================================
Next Question
====================================
*/

exports.nextQuestion = async (req, res) => {

    try {

        const { roomId } = req.params;

        /*
        ====================================
        Find Room
        ====================================
        */

        const room = await Room.findById(roomId);

        if (!room) {

            return res.status(404).json({

                success: false,

                message: "Room Not Found"

            });

        }

        /*
        ====================================
        Only Host Can Move Next
        ====================================
        */

        if (room.host.toString() !== req.user._id.toString()) {

            return res.status(403).json({

                success: false,

                message: "Only Host Can Change Question"

            });

        }

        /*
        ====================================
        Battle Service
        ====================================
        */

        const result = await nextQuestionService(room._id);

        if (result.completed) {

            return res.status(200).json({

                success: true,

                completed: true,

                message: "Battle Finished",

                room: result.room

            });

        }

        return res.status(200).json({

            success: true,

            completed: false,

            message: "Next Question Started",

            room: result.room

        });

    }

    catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

/*
====================================
Submit Battle Answer
====================================
*/

exports.submitBattleAnswer = async (req, res) => {

    try {

        const {

            roomId,

            questionId,

            selectedOption,

            codingAnswer,

            codingLanguage,

            longAnswer,

            fillBlankAnswer,

            trueFalseAnswer,

            timeTaken

        } = req.body;

        /*
        ====================================
        Find Room
        ====================================
        */

        const room = await Room.findById(roomId);

        if (!room) {

            return res.status(404).json({

                success: false,

                message: "Room Not Found"

            });

        }

        /*
        ====================================
        Quiz Started?
        ====================================
        */

        if (!room.isQuizStarted) {

            return res.status(400).json({

                success: false,

                message: "Quiz has not started."

            });

        }

        /*
        ====================================
        Find Player
        ====================================
        */

        const player = room.players.find(

            p => p.user.toString() === req.user._id.toString()

        );

        if (!player) {

            return res.status(404).json({

                success: false,

                message: "Player Not Found"

            });

        }

        /*
        ====================================
        Find Question
        ====================================
        */

        const question = await Question.findById(questionId);

        if (!question) {

            return res.status(404).json({

                success: false,

                message: "Question Not Found"

            });

        }

        let obtainedMarks = 0;

        let isCorrect = false;

        /*
        ====================================
        MCQ
        ====================================
        */

        if (question.questionType === "MCQ") {

            isCorrect =

                selectedOption ===

                question.correctAnswerIndex;

            obtainedMarks =

                isCorrect

                ? question.marks

                : 0;

        }

        /*
        ====================================
        Fill Blank
        ====================================
        */

        if (question.questionType === "FILL") {

            isCorrect =

                fillBlankAnswer?.trim().toLowerCase() ===

                question.fillBlank.answer.trim().toLowerCase();

            obtainedMarks =

                isCorrect

                ? question.marks

                : 0;

        }

        /*
        ====================================
        True False
        ====================================
        */

        if (question.questionType === "TRUE_FALSE") {

            isCorrect =

                trueFalseAnswer ===

                question.trueFalse.answer;

            obtainedMarks =

                isCorrect

                ? question.marks

                : 0;

        }

        /*
        ====================================
        Coding & Long

        AI Later
        ====================================
        */

        player.score += obtainedMarks;

        await room.save();

        return res.status(200).json({

            success: true,

            message: "Answer Submitted",

            score: player.score,

            obtainedMarks,

            isCorrect,

            pendingAIEvaluation:

                question.questionType === "CODING" ||

                question.questionType === "LONG"

        });

    }

    catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

};


/*
====================================
End Battle
====================================
*/

exports.endBattle = async (req, res) => {

    try {

        const { roomId } = req.params;

        const room = await Room.findById(roomId)
            .populate("players.user", "name email");

        if (!room) {

            return res.status(404).json({

                success: false,

                message: "Room Not Found"

            });

        }

        /*
        ====================================
        Only Host
        ====================================
        */

        if (room.host.toString() !== req.user._id.toString()) {

            return res.status(403).json({

                success: false,

                message: "Only Host Can End Battle"

            });

        }

        /*
        ====================================
        Find Winner
        ====================================
        */

        let winner = null;

        let highestScore = -1;

        room.players.forEach(player => {

            if (player.score > highestScore) {

                highestScore = player.score;

                winner = player.user._id;

            }

        });

        /*
        ====================================
        End Battle
        ====================================
        */

        const updatedRoom = await endBattleService(room._id);

        updatedRoom.winner = winner;

        await updatedRoom.save();

        const leaderboard = [...room.players].sort(

            (a, b) => b.score - a.score

        );

        return res.status(200).json({

            success: true,

            message: "Battle Ended Successfully",

            winner,

            leaderboard,

            room: updatedRoom

        });

    }

    catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

};


/*
====================================
Get Leaderboard
====================================
*/

exports.getLeaderboard = async (req, res) => {

    try {

        const { roomId } = req.params;

        /*
        ====================================
        Find Room
        ====================================
        */

        const room = await Room.findById(roomId)
            .populate("players.user", "name email")
            .populate("winner", "name email");

        if (!room) {

            return res.status(404).json({

                success: false,

                message: "Room Not Found"

            });

        }

        /*
        ====================================
        Sort Leaderboard
        ====================================
        */

        const leaderboard = [...room.players].sort(

            (a, b) => {

                if (b.score !== a.score) {

                    return b.score - a.score;

                }

                return new Date(a.joinedAt) - new Date(b.joinedAt);

            }

        );

        /*
        ====================================
        Response
        ====================================
        */

        return res.status(200).json({

            success: true,

            roomId: room._id,

            roomName: room.roomName,

            status: room.status,

            winner: room.winner,

            leaderboard

        });

    }

    catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

/*
====================================
Get Current Question
====================================
*/

exports.getCurrentQuestion = async (req, res) => {

    try {

        const { roomId } = req.params;

        /*
        ====================================
        Find Room
        ====================================
        */

        const room = await Room.findById(roomId);

        if (!room) {

            return res.status(404).json({

                success: false,

                message: "Room Not Found"

            });

        }

        /*
        ====================================
        Quiz Selected?
        ====================================
        */

        if (!room.quiz) {

            return res.status(400).json({

                success: false,

                message: "No Quiz Selected"

            });

        }

        /*
====================================
Get Current Question Only
====================================
*/

const totalQuestions = await Question.countDocuments({

    quiz: room.quiz

});

if (totalQuestions === 0) {

    return res.status(404).json({

        success: false,

        message: "No Questions Found"

    });

}

const currentQuestion = await Question.findOne({

    quiz: room.quiz

})
.sort({

    createdAt: 1

})
.skip(room.currentQuestion);

if (!currentQuestion) {

    return res.status(404).json({

        success: false,

        message: "Question Not Found"

    });

}
        /*
        ====================================
        Hide Answers
        ====================================
        */

        const responseQuestion = {

            _id: currentQuestion._id,

            questionType: currentQuestion.questionType,

            question: currentQuestion.question,

            options: currentQuestion.options,

            image: currentQuestion.image,

            marks: currentQuestion.marks,

            coding: {

                language: currentQuestion.coding.language,

                starterCode: currentQuestion.coding.starterCode,

                testCases: []

            },

            longAnswer: {

                minimumWords:

                    currentQuestion.longAnswer.minimumWords

            }

        };

        return res.status(200).json({

            success: true,

            questionNumber: room.currentQuestion + 1,

           totalQuestions,

            question: responseQuestion

        });

    }

    catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

};