const Room = require("../model/Room");
const Quiz = require("../model/Quiz");
const Question = require("../model/Question");
const mongoose = require("mongoose");

const {
    createPracticeRoom,
    createBattleRoom,
} = require("../service/roomService");

const {
    startBattleService,
    nextQuestionService,
    endBattleService,
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
    console.error("CREATE ROOM ERROR:", error.stack);

    return res.status(500).json({
        success: false,
        message: error.message,
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

        if (!roomCode || !String(roomCode).trim()) {
            return res.status(400).json({
                success: false,
                message: "Room code is required.",
            });
        }

        const room = await Room.findOne({
            roomCode: String(roomCode).trim(),
        });

        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Room not found.",
            });
        }

        if (
            room.gameMode !== "BATTLE" ||
            room.status !== "Waiting" ||
            room.isQuizEnded
        ) {
            return res.status(400).json({
                success: false,
                message: "This room is not accepting players.",
            });
        }

        const userId = req.user._id.toString();

        const existingPlayer = room.players.find(
            (player) => player.user.toString() === userId
        );

        if (existingPlayer) {
            if (existingPlayer.isRemoved) {
                return res.status(403).json({
                    success: false,
                    message: "You were removed from this room and cannot rejoin.",
                });
            }

            return res.status(200).json({
                success: true,
                alreadyJoined: true,
                message: "You are already in this room.",
                room,
            });
        }

        if (room.roomType === "Private") {
            return res.status(403).json({
                success: false,
                message: "This is a private room. Join using a valid invitation or access code.",
            });
        }

        const activePlayers = room.players.filter(
            (player) => !player.isRemoved
        );

        if (activePlayers.length >= room.maxPlayers) {
            return res.status(400).json({
                success: false,
                message: "Room is full.",
            });
        }

        room.players.push({
            user: req.user._id,
            isReady: false,
            isHost: false,
            isRemoved: false,
        });

        await room.save();

        return res.status(200).json({
            success: true,
            message: "Joined room successfully.",
            room,
        });
    } catch (error) {
        console.error("joinRoom error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to join room.",
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
                message: "Room not found.",
            });
        }

        const userId = req.user._id.toString();

        const currentPlayer = room.players.find(
            (player) =>
                player.user &&
                player.user._id.toString() === userId
        );

        const isHost = room.host &&
            room.host._id.toString() === userId;

        if (!isHost && (!currentPlayer || currentPlayer.isRemoved)) {
            return res.status(403).json({
                success: false,
                message: "You are not an active player in this room.",
            });
        }

        const roomData = room.toObject();

        roomData.players = roomData.players
            .filter((player) => !player.isRemoved)
            .map((player) => {
                delete player.responseId;
                return player;
            });

        roomData.myResponseId =
            currentPlayer && !currentPlayer.isRemoved
                ? currentPlayer.responseId || null
                : null;

        return res.status(200).json({
            success: true,
            room: roomData,
        });
    } catch (error) {
        console.error("getRoom error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch room.",
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

        if (!mongoose.Types.ObjectId.isValid(roomId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid room ID.",
            });
        }

        const room = await Room.findById(roomId);

        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Room not found.",
            });
        }

        // Leaving an active or completed battle must not delete its results.
        if (room.status !== "Waiting" || room.isQuizStarted || room.isQuizEnded) {
            return res.status(400).json({
                success: false,
                message: "You cannot leave through this endpoint after the battle starts.",
            });
        }

        const userId = req.user._id.toString();
        const isHost = room.host.toString() === userId;

        const player = room.players.find(
            (entry) => entry.user.toString() === userId
        );

        if (!isHost && (!player || player.isRemoved)) {
            return res.status(403).json({
                success: false,
                message: "You are not an active player in this room.",
            });
        }

        // If the host leaves, delete the entire waiting room.
        if (isHost) {
            const roomCode = room.roomCode;

            await Room.findByIdAndDelete(room._id);

            // Notify connected clients so they can leave the deleted room.
            const io = req.app.get("io");

            if (io && roomCode) {
                io.to(roomCode).emit("room-closed", {
                    roomId: room._id.toString(),
                    message: "The host left. This waiting room has been closed.",
                });
            }

            return res.status(200).json({
                success: true,
                roomDeleted: true,
                message: "You left as host. The waiting room has been deleted.",
            });
        }

        // Preserve the player's record rather than deleting it.
        player.isRemoved = true;
        player.isReady = false;
        player.removedAt = new Date();
        player.removedBy = req.user._id;

        await room.save();

        const io = req.app.get("io");

        if (io && room.roomCode) {
            io.to(room.roomCode).emit("player-left", {
                roomId: room._id.toString(),
                playerId: userId,
                message: "A player left the waiting room.",
            });
        }

        return res.status(200).json({
            success: true,
            roomDeleted: false,
            message: "You left the waiting room successfully.",
        });
    } catch (error) {
        console.error("leaveRoom error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to leave the room.",
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
                message: "Room not found.",
            });
        }

        if (room.status !== "Waiting" || room.isQuizEnded) {
            return res.status(400).json({
                success: false,
                message: "Readiness cannot be changed after the battle starts.",
            });
        }

        const player = room.players.find(
            (entry) =>
                entry.user.toString() === req.user._id.toString()
        );

        if (!player || player.isRemoved) {
            return res.status(403).json({
                success: false,
                message: "You are not an active player in this room.",
            });
        }

        player.isReady = !player.isReady;

        await room.save();

        return res.status(200).json({
            success: true,
            message: player.isReady
                ? "You are ready."
                : "You are not ready.",
            isReady: player.isReady,
        });
    } catch (error) {
        console.error("toggleReady error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update readiness.",
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
        const room = await Room.findById(req.params.roomId);

        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Room not found.",
            });
        }

        if (room.status !== "Waiting" || room.isQuizEnded) {
            return res.status(400).json({
                success: false,
                message: "This room cannot be started.",
            });
        }

        if (room.host.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Only the host can start the battle.",
            });
        }

        if (!room.quiz) {
            return res.status(400).json({
                success: false,
                message: "Please select a quiz first.",
            });
        }

        const activePlayers = room.players.filter(
            (player) => !player.isRemoved
        );

        if (activePlayers.length < 2) {
            return res.status(400).json({
                success: false,
                message: "At least two active players are required.",
            });
        }

        const notReady = activePlayers.find(
            (player) => !player.isReady
        );

        if (notReady) {
            return res.status(400).json({
                success: false,
                message: "All active players must be ready.",
            });
        }

        const updatedRoom = await startBattleService(room._id);

        return res.status(200).json({
            success: true,
            message: "Battle started successfully.",
            room: updatedRoom,
        });
    } catch (error) {
        console.error("startRoom error:", error);

        return res.status(400).json({
            success: false,
            message: error.message || "Failed to start battle.",
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

        if (!mongoose.Types.ObjectId.isValid(roomId) ||
            !mongoose.Types.ObjectId.isValid(quizId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid room ID or quiz ID.",
            });
        }

        const room = await Room.findById(roomId);

        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Room not found.",
            });
        }

        if (room.status !== "Waiting" || room.isQuizEnded) {
            return res.status(400).json({
                success: false,
                message: "The quiz cannot be changed after the battle starts.",
            });
        }

        if (room.host.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Only the host can select a quiz.",
            });
        }

        const quiz = await Quiz.findById(quizId);

        if (!quiz) {
            return res.status(404).json({
                success: false,
                message: "Quiz not found.",
            });
        }

        if (quiz.status !== "PUBLISHED") {
            return res.status(400).json({
                success: false,
                message: "Only published quizzes can be selected.",
            });
        }

        if (quiz.visibility === "PRIVATE") {
            return res.status(403).json({
                success: false,
                message: "Private quizzes cannot be selected through this endpoint.",
            });
        }

        const questionCount = await Question.countDocuments({
            quiz: quiz._id,
        });

        if (questionCount === 0) {
            return res.status(400).json({
                success: false,
                message: "This quiz has no questions.",
            });
        }

        room.quiz = quiz._id;
        room.totalQuestions = questionCount;

        await room.save();

        return res.status(200).json({
            success: true,
            message: "Quiz selected successfully.",
            room,
        });
    } catch (error) {
        console.error("selectQuiz error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to select quiz.",
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

        if (!roomId || !questionId) {
            return res.status(400).json({
                success: false,
                message: "Room ID and question ID are required."
            });
        }

        const room = await Room.findById(roomId);

        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Room not found."
            });
        }

        // Only accept answers while the battle is active.
        if (
            room.status !== "Started" ||
            !room.isQuizStarted ||
            room.isQuizEnded
        ) {
            return res.status(400).json({
                success: false,
                message: "This battle is not accepting answers."
            });
        }

        // Enforce the server's shared deadline.
        if (
            !room.quizEndTime ||
            Date.now() >= new Date(room.quizEndTime).getTime()
        ) {
            return res.status(400).json({
                success: false,
                message: "The battle time has expired."
            });
        }

        const player = room.players.find(
            p => p.user.toString() === req.user._id.toString()
        );

        if (!player || player.isRemoved) {
            return res.status(403).json({
                success: false,
                message: "You are not an active player in this battle."
            });
        }

        if (!player.responseId) {
            return res.status(400).json({
                success: false,
                message: "Your battle response was not initialized."
            });
        }

        const question = await Question.findById(questionId);

        if (!question) {
            return res.status(404).json({
                success: false,
                message: "Question not found."
            });
        }

        if (question.quiz.toString() !== room.quiz.toString()) {
            return res.status(400).json({
                success: false,
                message: "This question does not belong to the selected quiz."
            });
        }

        // If the service saved a fixed question order, enforce it.
        if (
            Array.isArray(room.questionOrder) &&
            room.questionOrder.length > 0 &&
            !room.questionOrder.some(
                id => id.toString() === questionId.toString()
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "This question is not part of this battle."
            });
        }

        const response = await Response.findById(player.responseId);

        if (!response) {
            return res.status(404).json({
                success: false,
                message: "Battle response not found."
            });
        }

        if (response.submitted) {
            return res.status(400).json({
                success: false,
                message: "Your battle response has already been submitted."
            });
        }

        // A question can earn points only once per player.
        const alreadyAnswered = response.answers.some(
            answer => answer.question.toString() === questionId.toString()
        );

        if (alreadyAnswered) {
            return res.status(409).json({
                success: false,
                message: "You have already answered this question."
            });
        }

        let isCorrect = false;
        let obtainedMarks = 0;

        if (question.questionType === "MCQ") {
            const optionIndex = Number(selectedOption);

            if (
                Number.isInteger(optionIndex) &&
                optionIndex === question.correctAnswerIndex
            ) {
                isCorrect = true;
                obtainedMarks = question.marks || 0;
            }
        } else if (question.questionType === "FILL") {
            const submittedText = String(fillBlankAnswer ?? "")
                .trim()
                .toLowerCase();

            const correctText = String(question.fillBlank?.answer ?? "")
                .trim()
                .toLowerCase();

            isCorrect = submittedText !== "" && submittedText === correctText;
            obtainedMarks = isCorrect ? (question.marks || 0) : 0;
        } else if (question.questionType === "TRUE_FALSE") {
            isCorrect =
                typeof trueFalseAnswer === "boolean" &&
                trueFalseAnswer === question.trueFalse?.answer;

            obtainedMarks = isCorrect ? (question.marks || 0) : 0;
        }

        // Coding and long answers remain ungraded here.
        // AI evaluation will be connected in the evaluation step.
        response.answers.push({
            question: question._id,
            questionType: question.questionType,
            selectedOption:
                Number.isInteger(Number(selectedOption)) &&
                selectedOption !== undefined &&
                selectedOption !== null
                    ? Number(selectedOption)
                    : null,
            codingAnswer: codingAnswer || "",
            codingLanguage: codingLanguage || "",
            longAnswer: longAnswer || "",
            fillBlankAnswer: fillBlankAnswer || "",
            trueFalseAnswer:
                typeof trueFalseAnswer === "boolean"
                    ? trueFalseAnswer
                    : null,
            obtainedMarks,
            maxMarks: question.marks || 0,
            isCorrect,
            evaluatedByAI: false,
            aiFeedback: "",
            timeTaken: Math.max(0, Number(timeTaken) || 0)
        });

        response.obtainedMarks =
            (Number(response.obtainedMarks) || 0) + obtainedMarks;

        response.attemptedQuestions = response.answers.length;
        response.correctAnswers = response.answers.filter(
            answer => answer.isCorrect
        ).length;
        response.wrongAnswers =
            response.attemptedQuestions - response.correctAnswers;

        if (Number(response.totalMarks) > 0) {
            response.percentage = Number(
                (
                    (response.obtainedMarks / response.totalMarks) * 100
                ).toFixed(2)
            );
        }

        await response.save();

        // Derive the room score from the saved response rather than
        // incrementing it independently for every request.
        player.score = response.obtainedMarks;
        await room.save();

        return res.status(200).json({
            success: true,
            message: "Answer submitted successfully.",
            obtainedMarks,
            isCorrect,
            score: player.score,
            pendingAIEvaluation:
                question.questionType === "CODING" ||
                question.questionType === "LONG"
        });
    } catch (error) {
        console.error("submitBattleAnswer error:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Could not submit your answer."
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

        // Find the room
        const room = await Room.findById(roomId);

        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Room Not Found",
            });
        }

        // Only the host can manually end the battle
        if (room.host.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Only the host can end the battle.",
            });
        }

        // Finalize responses and calculate scores on the server
        const finalizedRoom = await endBattleService(room._id);

        // Fetch the finalized data rather than using stale scores
        const updatedRoom = await Room.findById(finalizedRoom._id)
            .populate("players.user", "name email")
            .populate("winner", "name email");

        if (!updatedRoom) {
            return res.status(404).json({
                success: false,
                message: "Room not found after finalization.",
            });
        }

        // Exclude removed players and sort by final score
        const leaderboard = updatedRoom.players
            .filter((player) => !player.isRemoved && player.user)
            .sort((a, b) => {
                const scoreDifference =
                    Number(b.score || 0) - Number(a.score || 0);

                if (scoreDifference !== 0) {
                    return scoreDifference;
                }

                // Consistent ordering for tied scores
                return (
                    new Date(a.joinedAt || 0).getTime() -
                    new Date(b.joinedAt || 0).getTime()
                );
            })
            .map((player, index) => ({
                rank: index + 1,
                user: player.user,
                score: Number(player.score || 0),
                isHost: player.isHost,
            }));

        return res.status(200).json({
            success: true,
            message: "Battle Ended Successfully",
            winner: updatedRoom.winner,
            leaderboard,
            room: updatedRoom,
        });
    } catch (error) {
        console.error("endBattle error:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to end battle.",
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

        const room = await Room.findById(roomId);

        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Room not found."
            });
        }

        const player = room.players.find(
            p => p.user.toString() === req.user._id.toString()
        );

        if (!player || player.isRemoved) {
            return res.status(403).json({
                success: false,
                message: "You are not an active player in this room."
            });
        }

        if (!room.quiz) {
            return res.status(400).json({
                success: false,
                message: "No quiz has been selected."
            });
        }

        if (room.status !== "Started" || !room.isQuizStarted) {
            return res.status(400).json({
                success: false,
                message: "The battle has not started or has already ended."
            });
        }

        if (
            !room.quizEndTime ||
            Date.now() >= new Date(room.quizEndTime).getTime()
        ) {
            await endBattleService(room._id);

            return res.status(400).json({
                success: false,
                message: "Battle time has expired."
            });
        }

        const totalQuestions = Array.isArray(room.questionOrder)
            && room.questionOrder.length > 0
            ? room.questionOrder.length
            : await Question.countDocuments({ quiz: room.quiz });

        if (totalQuestions === 0) {
            return res.status(404).json({
                success: false,
                message: "No questions were found for this quiz."
            });
        }

        if (
            room.currentQuestion < 0 ||
            room.currentQuestion >= totalQuestions
        ) {
            return res.status(400).json({
                success: false,
                message: "There is no current question."
            });
        }

        let currentQuestion;

        if (
            Array.isArray(room.questionOrder) &&
            room.questionOrder.length > 0
        ) {
            const questionId = room.questionOrder[room.currentQuestion];

            currentQuestion = await Question.findOne({
                _id: questionId,
                quiz: room.quiz
            });
        } else {
            currentQuestion = await Question.findOne({
                quiz: room.quiz
            })
                .sort({ createdAt: 1, _id: 1 })
                .skip(room.currentQuestion);
        }

        if (!currentQuestion) {
            return res.status(404).json({
                success: false,
                message: "Current question not found."
            });
        }

        // Never send correct answers to players.
        const questionData = {
            _id: currentQuestion._id,
            questionType: currentQuestion.questionType,
            question: currentQuestion.question,
            options: currentQuestion.options,
            image: currentQuestion.image,
            marks: currentQuestion.marks,
            coding: {
                language: currentQuestion.coding?.language,
                starterCode: currentQuestion.coding?.starterCode,
                testCases: []
            },
            longAnswer: {
                minimumWords:
                    currentQuestion.longAnswer?.minimumWords
            }
        };

        return res.status(200).json({
            success: true,
            questionNumber: room.currentQuestion + 1,
            totalQuestions,
            remainingTime: Math.max(
                0,
                Math.ceil(
                    (new Date(room.quizEndTime).getTime() - Date.now()) / 1000
                )
            ),
            question: questionData
        });
    } catch (error) {
        console.error("getCurrentQuestion error:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Could not load the current question."
        });
    }
};



// ====================================
// Get Public Waiting Rooms
// ====================================
exports.getPublicRooms = async (req, res) => {
    try {
        const rooms = await Room.find({
            roomType: "Public",
            gameMode: "BATTLE",
            status: "Waiting",
            isQuizEnded: false,
        })
            .populate("host", "name")
            .populate("quiz", "title category difficulty")
            .sort({ createdAt: -1 });

        // Exclude removed players when calculating available slots.
        const availableRooms = rooms
            .filter((room) => {
                const activePlayers = room.players.filter(
                    (player) => !player.isRemoved
                );

                return activePlayers.length < room.maxPlayers;
            })
            .map((room) => {
                const roomObject = room.toObject();

                roomObject.players = roomObject.players.filter(
                    (player) => !player.isRemoved
                );

                roomObject.availableSlots =
                    room.maxPlayers - roomObject.players.length;

                return roomObject;
            });

        return res.status(200).json({
            success: true,
            count: availableRooms.length,
            rooms: availableRooms,
        });
    } catch (error) {
        console.error("getPublicRooms error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch public rooms.",
        });
    }
};


// ====================================
// Host Removes a Player
// ====================================
exports.removePlayer = async (req, res) => {
    try {
        const { roomId, playerId } = req.params;

        if (
            !require("mongoose").Types.ObjectId.isValid(roomId) ||
            !require("mongoose").Types.ObjectId.isValid(playerId)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid room ID or player ID.",
            });
        }

        const room = await Room.findById(roomId);

        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Room not found.",
            });
        }

        if (room.host.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Only the host can remove players.",
            });
        }

        if (room.status === "Completed" || room.isQuizEnded) {
            return res.status(400).json({
                success: false,
                message: "The battle has already ended.",
            });
        }

        if (playerId === room.host.toString()) {
            return res.status(400).json({
                success: false,
                message: "The host cannot remove themselves.",
            });
        }

        const player = room.players.find(
            (entry) => entry.user.toString() === playerId
        );

        if (!player || player.isRemoved) {
            return res.status(404).json({
                success: false,
                message: "Active player not found in this room.",
            });
        }

        player.isRemoved = true;
        player.removedAt = new Date();
        player.removedBy = req.user._id;
        player.isReady = false;

        await room.save();

        // Notify connected clients if Socket.IO is configured.
        const io = req.app.get("io");

        if (io) {
            io.to(room.roomCode).emit("player-removed", {
                roomId: room._id.toString(),
                playerId,
                message: "A player has been removed by the host.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Player removed successfully.",
            roomId: room._id,
            playerId,
        });
    } catch (error) {
        console.error("removePlayer error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to remove player.",
        });
    }
};