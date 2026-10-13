const Room = require("../model/Room");
const Quiz = require("../model/Quiz");
const Question = require("../model/Question");
const Response = require("../model/Response");
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


const emitRoomUpdated = (io, room) => {
    if (!io || !room?.roomCode) return;

    const activePlayers = room.players.filter(
        (player) => !player.isRemoved
    );

    io.to(room.roomCode).emit("room-updated", {
        roomId: room._id.toString(),
        roomCode: room.roomCode,
        roomName: room.roomName,
        status: room.status,
        gameMode: room.gameMode,
        maxPlayers: room.maxPlayers,
        activePlayers: activePlayers.length,
        players: activePlayers.map((player) => ({
            userId: player.user.toString(),
            isReady: player.isReady,
            isHost: player.isHost,
            score: player.score,
        })),
        isQuizStarted: room.isQuizStarted,
        isQuizEnded: room.isQuizEnded,
    });
};
// Add this helper below emitRoomUpdated() in roomController.js

const emitPublicBattlesUpdated = (io, room = null) => {
    if (!io) return;

    io.emit("public-battles-updated", {
        roomId: room?._id ? String(room._id) : null,
        roomCode: room?.roomCode || null,
        status: room?.status || null,
    });
};


// Add this helper after emitPublicBattlesUpdated() in roomController.js.

const finalizePlayerResponse = async (room, player) => {
    if (!player?.responseId) return;

    const response = await Response.findById(player.responseId);

    if (!response || response.submitted) return;

    const totalQuestions = Array.isArray(room.questionOrder)
        ? room.questionOrder.length
        : 0;

    // Keep all answers already saved. Questions never answered remain skipped.
    const answeredQuestionIds = new Set(
        (response.answers || []).map((answer) =>
            answer.question.toString()
        )
    );

    response.attemptedQuestions = answeredQuestionIds.size;
    response.skippedQuestions = Math.max(
        0,
        totalQuestions - answeredQuestionIds.size
    );

    response.correctAnswers = (response.answers || []).filter(
        (answer) => answer.isCorrect
    ).length;

    response.wrongAnswers = Math.max(
        0,
        response.attemptedQuestions - response.correctAnswers
    );

    response.submitted = true;
    response.autoSubmitted = true;
    response.submittedAt = new Date();

    if (Number(response.totalMarks) > 0) {
        response.percentage = Number(
            (
                (Number(response.obtainedMarks || 0) /
                    Number(response.totalMarks)) *
                100
            ).toFixed(2)
        );
    } else {
        response.percentage = 0;
    }

    await response.save();
};

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
        // In exports.createRoom, after createBattleRoom(...) returns
// and before res.status(201).json(...)

const io = req.app.get("io");

if (
    room?.gameMode === "BATTLE" &&
    room?.roomType === "Public" &&
    room?.status === "Waiting"
) {
    emitPublicBattlesUpdated(io, room);
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

    // 1. Validate room code
    if (!roomCode || !String(roomCode).trim()) {
      return res.status(400).json({
        success: false,
        message: "Room code is required.",
      });
    }

    const normalizedCode = String(roomCode).trim().toUpperCase();
    const userId = req.user._id;

    // 2. Find the room
    const room = await Room.findOne({
      roomCode: normalizedCode,
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found.",
      });
    }

    // 3. Check whether the room accepts players
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

    // 4. Check existing membership
    const existingPlayer = room.players.find(
      (player) => player.user.toString() === userId.toString()
    );

    if (existingPlayer?.isRemoved) {
      return res.status(403).json({
        success: false,
        message: "You were removed from this room and cannot rejoin.",
      });
    }

    if (existingPlayer) {
      return res.status(200).json({
        success: true,
        alreadyJoined: true,
        message: "You are already in this room.",
        room,
      });
    }

    // 5. Atomically check capacity and add the player.
    // MongoDB evaluates the conditions against the document
    // when applying the update.
    const updatedRoom = await Room.findOneAndUpdate(
      {
        _id: room._id,
        gameMode: "BATTLE",
        status: "Waiting",
        isQuizEnded: { $ne: true },

        $and: [
          // Do not add a user who already has a player record.
          {
            players: {
              $not: {
                $elemMatch: { user: userId },
              },
            },
          },

          // Only join if an active seat is available.
          {
            $expr: {
              $lt: [
                {
                  $size: {
                    $filter: {
                      input: { $ifNull: ["$players", []] },
                      as: "player",
                      cond: {
                        $ne: ["$$player.isRemoved", true],
                      },
                    },
                  },
                },
                "$maxPlayers",
              ],
            },
          },
        ],
      },
      {
        $push: {
          players: {
            user: userId,
            isReady: false,
            isHost: false,
            isRemoved: false,
          },
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    // 6. The atomic update did not match.
    // Check the latest state to return the correct response.
    if (!updatedRoom) {
      const latestRoom = await Room.findById(room._id);

      if (!latestRoom) {
        return res.status(404).json({
          success: false,
          message: "Room not found.",
        });
      }

      const latestPlayer = latestRoom.players.find(
        (player) => player.user.toString() === userId.toString()
      );

      if (latestPlayer?.isRemoved) {
        return res.status(403).json({
          success: false,
          message: "You were removed from this room and cannot rejoin.",
        });
      }

      if (latestPlayer) {
        return res.status(200).json({
          success: true,
          alreadyJoined: true,
          message: "You are already in this room.",
          room: latestRoom,
        });
      }

      if (
        latestRoom.gameMode !== "BATTLE" ||
        latestRoom.status !== "Waiting" ||
        latestRoom.isQuizEnded
      ) {
        return res.status(400).json({
          success: false,
          message: "This room is not accepting players.",
        });
      }

      const activePlayers = latestRoom.players.filter(
        (player) => !player.isRemoved
      );

      if (activePlayers.length >= latestRoom.maxPlayers) {
        return res.status(400).json({
          success: false,
          message: "Room is full.",
        });
      }

      return res.status(409).json({
        success: false,
        message: "Room changed while joining. Please try again.",
      });
    }

    // 7. Successfully joined
    // 7. Successfully joined
const io = req.app.get("io");

emitRoomUpdated(io, updatedRoom);
emitPublicBattlesUpdated(io, updatedRoom);

return res.status(200).json({
    success: true,
    message: "Joined room successfully.",
    room: updatedRoom,
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
            .populate("host", "name email username")
            .populate("players.user", "name email username")
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
        const userId = req.user._id.toString();

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

        const io = req.app.get("io");

        // BEFORE the battle starts:
        // Host leaving closes the waiting room for everyone.
        if (
            room.status === "Waiting" &&
            !room.isQuizStarted &&
            !room.isQuizEnded
        ) {
            if (isHost) {
                const roomCode = room.roomCode;
                const deletedRoomId = room._id.toString();

                await Room.findByIdAndDelete(room._id);

                if (io && roomCode) {
                    io.to(roomCode).emit("room-closed", {
                        roomId: deletedRoomId,
                        message: "The host closed the waiting room.",
                    });

                    io.emit("public-battles-updated", {
                        roomId: deletedRoomId,
                        roomCode,
                        status: "Closed",
                    });
                }

                return res.status(200).json({
                    success: true,
                    roomDeleted: true,
                    message: "Waiting room closed successfully.",
                });
            }

            player.isRemoved = true;
            player.isReady = false;
            player.removedAt = new Date();
            player.removedBy = req.user._id;

            await room.save();

            if (io && room.roomCode) {
                io.to(room.roomCode).emit("player-left", {
                    roomId: room._id.toString(),
                    playerId: userId,
                });

                emitRoomUpdated(io, room);
                emitPublicBattlesUpdated(io, room);
            }

            return res.status(200).json({
                success: true,
                roomDeleted: false,
                message: "You left the waiting room.",
            });
        }

        // AFTER the battle starts:
        // Finalize this player's response, but do not end or delete the room.
        if (room.isQuizStarted && !room.isQuizEnded) {
            await finalizePlayerResponse(room, player);

            if (player) {
                player.isRemoved = true;
                player.isReady = false;
                player.removedAt = new Date();
                player.removedBy = req.user._id;
            }

            await room.save();

            if (io && room.roomCode) {
                io.to(room.roomCode).emit("player-left", {
                    roomId: room._id.toString(),
                    playerId: userId,
                    isHost,
                    message: isHost
                        ? "The host left the battle. The battle continues."
                        : "A player left the battle.",
                });

                emitRoomUpdated(io, room);
                emitPublicBattlesUpdated(io, room);
            }

            return res.status(200).json({
                success: true,
                roomDeleted: false,
                battleContinues: true,
                message:
                    "Your response has been finalized. The battle continues for the other players.",
            });
        }

        // Battle has already ended. Do not delete its results or room.
        if (room.isQuizEnded || room.status === "Completed") {
            return res.status(200).json({
                success: true,
                roomDeleted: false,
                message: "The battle has already ended.",
            });
        }

        return res.status(400).json({
            success: false,
            message: "This room cannot be left in its current state.",
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
        const io = req.app.get("io");
emitRoomUpdated(io, room);

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

        // 1. Check whether the room exists
        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Room not found.",
            });
        }

        // 2. Check whether the room can be started
        if (room.status !== "Waiting" || room.isQuizEnded) {
            return res.status(400).json({
                success: false,
                message: "This room cannot be started.",
            });
        }

        // 3. Only the host can start the battle
        if (room.host.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Only the host can start the battle.",
            });
        }

        // 4. A quiz must be selected before starting
        if (!room.quiz) {
            return res.status(400).json({
                success: false,
                message: "Please select a quiz first.",
            });
        }

        // 5. Require at least two active players
        const activePlayers = room.players.filter(
            (player) => !player.isRemoved
        );

        if (activePlayers.length < 2) {
            return res.status(400).json({
                success: false,
                message: "At least two active players are required.",
            });
        }

        // 6. Start the battle
        const updatedRoom = await startBattleService(room._id);

        // 7. Notify players through Socket.IO
        const io = req.app.get("io");

        if (io && updatedRoom.roomCode) {
            io.to(updatedRoom.roomCode).emit("battle-started", {
                roomId: updatedRoom._id.toString(),
                roomCode: updatedRoom.roomCode,
                status: updatedRoom.status,
                startedAt: updatedRoom.startedAt,
                quizEndTime: updatedRoom.quizEndTime,
            });

            // Broadcast the updated room information
            emitRoomUpdated(io, updatedRoom);
            emitPublicBattlesUpdated(io, room);
        }

        // 8. Send the successful response
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
        emitRoomUpdated(req.app.get("io"), room);

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
        // Derive the score from the saved response.
        player.score = Number(response.obtainedMarks) || 0;

        // Accumulate answer time in milliseconds.
        // Assumes the frontend sends timeTaken in seconds.
        const submittedTimeSeconds = Number(timeTaken);

        const validTimeSeconds =
            Number.isFinite(submittedTimeSeconds) &&
                submittedTimeSeconds >= 0
                ? submittedTimeSeconds
                : 0;

        player.totalAnswerTime =
            Number(player.totalAnswerTime || 0) +
            validTimeSeconds * 1000;

        player.answeredQuestions =
            Number(player.answeredQuestions || 0) + 1;

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

exports.getBattleQuestions = async (req, res) => {
    try {
        const { roomId } = req.params;
        const room = await Room.findById(roomId);

        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Room not found.",
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

        if (room.status !== "Started" || !room.isQuizStarted) {
            return res.status(400).json({
                success: false,
                message: "The battle is not active.",
            });
        }

        if (!room.quizEndTime || Date.now() >= room.quizEndTime.getTime()) {
            await endBattleService(room._id);
            return res.status(410).json({
                success: false,
                message: "Battle time has expired.",
            });
        }

        const questionIds = room.questionOrder || [];
        const questionQuery = questionIds.length
            ? { _id: { $in: questionIds }, quiz: room.quiz }
            : { quiz: room.quiz };

        const questionDocuments = await Question.find(questionQuery)
            .select(
                "_id questionType question options image marks coding.language coding.starterCode longAnswer.minimumWords"
            )
            .sort({ createdAt: 1, _id: 1 });

        const questionsById = new Map(
            questionDocuments.map((question) => [
                question._id.toString(),
                question,
            ])
        );
        const orderedQuestions = questionIds.length
            ? questionIds
                .map((id) => questionsById.get(id.toString()))
                .filter(Boolean)
            : questionDocuments;

        if (!orderedQuestions.length) {
            return res.status(404).json({
                success: false,
                message: "No questions were found for this battle.",
            });
        }

        const response = player.responseId
            ? await Response.findById(player.responseId).select("submitted")
            : null;

        return res.status(200).json({
            success: true,
            questions: orderedQuestions,
            totalQuestions: orderedQuestions.length,
            remainingTime: Math.max(
                0,
                Math.ceil((room.quizEndTime.getTime() - Date.now()) / 1000)
            ),
            serverTime: Date.now(),
            submitted: Boolean(response?.submitted),
        });
    } catch (error) {
        console.error("getBattleQuestions error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Could not load battle questions.",
        });
    }
};

exports.submitBattleAttempt = async (req, res) => {
    try {
        const { roomId, answers } = req.body;

        if (!roomId || !Array.isArray(answers)) {
            return res.status(400).json({
                success: false,
                message: "Room ID and an answers array are required.",
            });
        }

        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Room not found.",
            });
        }

        if (
            room.status !== "Started" ||
            !room.isQuizStarted ||
            room.isQuizEnded
        ) {
            return res.status(400).json({
                success: false,
                message: "This battle is not accepting submissions.",
            });
        }

        if (!room.quizEndTime || Date.now() >= room.quizEndTime.getTime()) {
            await endBattleService(room._id);
            return res.status(400).json({
                success: false,
                message: "The battle time has expired.",
            });
        }

        const player = room.players.find(
            (entry) =>
                entry.user.toString() === req.user._id.toString()
        );

        if (!player || player.isRemoved || !player.responseId) {
            return res.status(403).json({
                success: false,
                message: "You are not an active player in this battle.",
            });
        }

        const response = await Response.findById(player.responseId);
        if (!response) {
            return res.status(404).json({
                success: false,
                message: "Battle response not found.",
            });
        }

        if (response.submitted) {
            return res.status(409).json({
                success: false,
                message: "Your answers have already been submitted.",
            });
        }

        const questionIds = (room.questionOrder || []).map((id) =>
            id.toString()
        );
        if (
            answers.length !== questionIds.length ||
            new Set(answers.map((answer) => String(answer.questionId))).size !==
            questionIds.length ||
            answers.some(
                (answer) => !questionIds.includes(String(answer.questionId))
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Submit one answer entry for every battle question.",
            });
        }

        const questions = await Question.find({
            _id: { $in: room.questionOrder },
            quiz: room.quiz,
        }).select(
            "_id questionType marks options correctAnswerIndex +fillBlank.answer +trueFalse.answer +longAnswer.expectedAnswer"
        );
        const questionsById = new Map(
            questions.map((question) => [
                question._id.toString(),
                question,
            ])
        );
        const answerByQuestionId = new Map(
            answers.map((answer) => [
                String(answer.questionId),
                answer,
            ])
        );
        const savedAnswers = [];

        for (const questionId of questionIds) {
            const question = questionsById.get(questionId);
            const submittedAnswer = answerByQuestionId.get(questionId);

            if (!question || !submittedAnswer) {
                return res.status(400).json({
                    success: false,
                    message: "A battle question or answer is missing.",
                });
            }

            const selectedOption =
                submittedAnswer.selectedOption === null ||
                    submittedAnswer.selectedOption === undefined ||
                    submittedAnswer.selectedOption === ""
                    ? null
                    : Number(submittedAnswer.selectedOption);
            const fillBlankAnswer = String(
                submittedAnswer.fillBlankAnswer || ""
            ).trim();
            const trueFalseAnswer =
                typeof submittedAnswer.trueFalseAnswer === "boolean"
                    ? submittedAnswer.trueFalseAnswer
                    : null;
            const longAnswer = String(
                submittedAnswer.longAnswer || ""
            ).trim();
            const codingAnswer = String(
                submittedAnswer.codingAnswer || ""
            );

            const attempted =
                (["MCQ", "IMAGE"].includes(question.questionType) &&
                    Number.isInteger(selectedOption)) ||
                (question.questionType === "TRUE_FALSE" &&
                    trueFalseAnswer !== null) ||
                (question.questionType === "FILL" && fillBlankAnswer !== "") ||
                (question.questionType === "LONG" && longAnswer !== "") ||
                (question.questionType === "CODING" && codingAnswer.trim() !== "");

            if (!attempted) continue;

            let isCorrect = false;
            if (["MCQ", "IMAGE"].includes(question.questionType)) {
                isCorrect =
                    selectedOption >= 0 &&
                    selectedOption < question.options.length &&
                    selectedOption === question.correctAnswerIndex;
            } else if (question.questionType === "TRUE_FALSE") {
                isCorrect = trueFalseAnswer === question.trueFalse?.answer;
            } else if (question.questionType === "FILL") {
                isCorrect =
                    fillBlankAnswer.toLowerCase() ===
                    String(question.fillBlank?.answer || "")
                        .trim()
                        .toLowerCase();
            }

            const obtainedMarks =
                isCorrect && !["CODING", "LONG"].includes(question.questionType)
                    ? Number(question.marks) || 0
                    : 0;

            savedAnswers.push({
                question: question._id,
                questionType: question.questionType,
                selectedOption,
                codingAnswer,
                codingLanguage: String(
                    submittedAnswer.codingLanguage || ""
                ),
                longAnswer,
                fillBlankAnswer,
                trueFalseAnswer,
                obtainedMarks,
                maxMarks: Number(question.marks) || 0,
                isCorrect,
                evaluatedByAI: false,
                aiFeedback: "",
            });
        }

        const now = new Date();
        const obtainedMarks = savedAnswers.reduce(
            (total, answer) => total + answer.obtainedMarks,
            0
        );
        response.answers = savedAnswers;
        response.attemptedQuestions = savedAnswers.length;
        response.skippedQuestions = Math.max(
            0,
            questionIds.length - savedAnswers.length
        );
        response.correctAnswers = savedAnswers.filter(
            (answer) => answer.isCorrect
        ).length;
        response.wrongAnswers =
            response.attemptedQuestions - response.correctAnswers;
        response.obtainedMarks = obtainedMarks;
        response.percentage =
            Number(response.totalMarks) > 0
                ? Number(
                    (
                        (obtainedMarks / Number(response.totalMarks)) *
                        100
                    ).toFixed(2)
                )
                : 0;
        response.submitted = true;
        response.autoSubmitted = false;
        response.submittedAt = now;
        response.timeTaken = Math.max(
            0,
            Math.floor((now.getTime() - new Date(response.startedAt).getTime()) / 1000)
        );
        await response.save();

        player.score = obtainedMarks;
        await room.save();

        const activePlayers = room.players.filter(
            (entry) => !entry.isRemoved
        );
        const playerResponses = await Response.find({
            room: room._id,
            user: { $in: activePlayers.map((entry) => entry.user) },
        }).select("user submitted");
        const allPlayersSubmitted =
            playerResponses.length === activePlayers.length &&
            playerResponses.every((entry) => entry.submitted);

        if (allPlayersSubmitted) {
            await endBattleService(room._id);
        }

        return res.status(200).json({
            success: true,
            message: allPlayersSubmitted
                ? "All players have submitted. The results are ready."
                : "Your answers are submitted. Waiting for the other players.",
            submitted: true,
            allPlayersSubmitted,
            score: obtainedMarks,
        });
    } catch (error) {
        console.error("submitBattleAttempt error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Could not submit your battle answers.",
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
        const leaderboard = room.players
            .filter((player) => !player.isRemoved && player.user)
            .sort((a, b) => {
                // 1. Higher score ranks first.
                const scoreDifference =
                    Number(b.score || 0) - Number(a.score || 0);

                if (scoreDifference !== 0) {
                    return scoreDifference;
                }

                // 2. For tied scores, lower answer time ranks first.
                const timeDifference =
                    Number(a.totalAnswerTime || 0) -
                    Number(b.totalAnswerTime || 0);

                if (timeDifference !== 0) {
                    return timeDifference;
                }

                // 3. If score and time are equal, earlier join ranks first.
                return (
                    new Date(a.joinedAt || 0).getTime() -
                    new Date(b.joinedAt || 0).getTime()
                );
            })
            .map((player, index) => ({
                rank: index + 1,
                user: player.user,
                score: Number(player.score || 0),
                totalAnswerTime: Number(player.totalAnswerTime || 0),
                answeredQuestions: Number(player.answeredQuestions || 0),
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

        // 1. Validate IDs
        if (
            !mongoose.Types.ObjectId.isValid(roomId) ||
            !mongoose.Types.ObjectId.isValid(playerId)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid room ID or player ID.",
            });
        }

        // 2. Find the room
        const room = await Room.findById(roomId);

        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Room not found.",
            });
        }

        // 3. Only the host can remove players
        if (
            room.host.toString() !== req.user._id.toString()
        ) {
            return res.status(403).json({
                success: false,
                message: "Only the host can remove players.",
            });
        }

        // 4. Prevent removal after the battle ends
        if (
            room.status === "Completed" ||
            room.isQuizEnded
        ) {
            return res.status(400).json({
                success: false,
                message: "The battle has already ended.",
            });
        }

        // 5. Prevent the host from removing themselves
        if (playerId === room.host.toString()) {
            return res.status(400).json({
                success: false,
                message: "The host cannot remove themselves.",
            });
        }

        // 6. Find the player in this room
        const player = room.players.find(
            (entry) =>
                entry.user.toString() === playerId
        );

        if (!player || player.isRemoved) {
            return res.status(404).json({
                success: false,
                message: "Active player not found in this room.",
            });
        }

        // 7. Mark the player as removed
        player.isRemoved = true;
        player.removedAt = new Date();
        player.removedBy = req.user._id;
        player.isReady = false;

        await room.save();

        // 8. Get Socket.IO instance
        const io = req.app.get("io");

        if (io && room.roomCode) {
            const removedPlayerId = player.user.toString();

            // 9. Notify all currently connected room members
            io.to(room.roomCode).emit("player-removed", {
                roomId: room._id.toString(),
                playerId: removedPlayerId,
                message: "A player has been removed by the host.",
            });

            // 10. Find sockets currently connected to this room
            const roomSockets = await io
                .in(room.roomCode)
                .fetchSockets();

            // 11. Remove all sockets belonging to the removed player
            for (const roomSocket of roomSockets) {
                if (
                    roomSocket.user?._id?.toString() ===
                    removedPlayerId
                ) {
                    // Remove the socket from this room
                    await roomSocket.leave(room.roomCode);

                    // Inform the removed player
                    roomSocket.emit("room-error", {
                        message:
                            "You have been removed from this room by the host.",
                    });
                }
            }

            // 12. Update the remaining room members
            emitRoomUpdated(io, room);
            emitPublicBattlesUpdated(io, room);
        }

        // 13. Send API response
        return res.status(200).json({
            success: true,
            message: "Player removed successfully.",
            roomId: room._id,
            playerId: player.user.toString(),
        });
    } catch (error) {
        console.error("removePlayer error:", error);

        return res.status(500).json({
            success: false,
            message:
                error.message || "Failed to remove player.",
        });
    }
};
