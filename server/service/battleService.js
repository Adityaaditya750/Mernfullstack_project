const Room = require("../model/Room");
const Question = require("../model/Question");
const Quiz = require("../model/Quiz");
const Response = require("../model/Response");

// Keep one timer per active room in this Node.js process.
const battleTimers = new Map();
const finalizationLocks = new Map();
const getActivePlayers = (room) =>
    room.players.filter((player) => !player.isRemoved);

const scheduleBattleEnd = (roomId, deadline) => {
    const id = roomId.toString();

    const existingTimer = battleTimers.get(id);

    if (existingTimer) {
        clearTimeout(existingTimer);
    }

    const delay = Math.max(0, new Date(deadline).getTime() - Date.now());

    const timer = setTimeout(async () => {
        battleTimers.delete(id);

        try {
            await exports.endBattleService(id);
        } catch (error) {
            console.error(`Failed to finalize battle ${id}:`, error);
        }
    }, Math.min(delay, 2147483647));

    // Don't keep Node alive solely for a battle timer.
    if (typeof timer.unref === "function") {
        timer.unref();
    }

    battleTimers.set(id, timer);
};

const finalizeBattle = async (roomOrId) => {
    const roomId = roomOrId?._id || roomOrId;

    if (!roomId) {
        throw new Error("Room ID is required to finalize a battle.");
    }

    const id = roomId.toString();

    // If finalization is already running for this room,
    // reuse the same promise instead of running it again.
    if (finalizationLocks.has(id)) {
        return finalizationLocks.get(id);
    }

    const finalizationPromise = (async () => {
        // Always load the latest room state from MongoDB.
        const room = await Room.findById(id);

        if (!room) {
            throw new Error("Room Not Found");
        }

        // The battle has already been finalized.
        if (room.status === "Completed" || room.isQuizEnded) {
            const existingTimer = battleTimers.get(id);

            if (existingTimer) {
                clearTimeout(existingTimer);
                battleTimers.delete(id);
            }

            return room;
        }

        const now = new Date();

        // Load every response belonging to this battle.
        const responses = await Response.find({
            room: room._id,
        });

        for (const response of responses) {
            if (!response.submitted) {
                response.submitted = true;
                response.autoSubmitted = true;
                response.submittedAt = now;

                // Calculate the score from saved answers.
                response.obtainedMarks = (
                    response.answers || []
                ).reduce(
                    (sum, answer) =>
                        sum + (Number(answer.obtainedMarks) || 0),
                    0
                );

                response.correctAnswers = (
                    response.answers || []
                ).filter((answer) => answer.isCorrect).length;

                response.attemptedQuestions = (
                    response.answers || []
                ).length;

                response.wrongAnswers = Math.max(
                    0,
                    response.attemptedQuestions -
                        response.correctAnswers
                );

                response.skippedQuestions = Math.max(
                    0,
                    (Number(response.totalQuestions) || 0) -
                        response.attemptedQuestions
                );

                response.percentage =
                    Number(response.totalMarks) > 0
                        ? Number(
                              (
                                  (response.obtainedMarks /
                                      response.totalMarks) *
                                  100
                              ).toFixed(2)
                          )
                        : 0;

                await response.save();
            }

            // Synchronize the player's score with the saved response.
            const player = room.players.find(
                (entry) =>
                    entry.user.toString() ===
                    response.user.toString()
            );

            if (player) {
                player.score =
                    Number(response.obtainedMarks) || 0;
            }
        }

        // Rank active players by score.
        // Earlier join time breaks ties.
        const rankedPlayers = room.players
            .filter((player) => !player.isRemoved)
            .sort((a, b) => {
                const scoreDifference =
                    (Number(b.score) || 0) -
                    (Number(a.score) || 0);

                if (scoreDifference !== 0) {
                    return scoreDifference;
                }

                return (
                    new Date(a.joinedAt || 0).getTime() -
                    new Date(b.joinedAt || 0).getTime()
                );
            });

        room.winner = rankedPlayers[0]?.user || null;
        room.status = "Completed";
        room.isQuizEnded = true;
        room.isQuizStarted = false;
        room.remainingTime = 0;
        room.endedAt = now;

        await room.save();

        // Stop the timer after successful finalization.
        const timer = battleTimers.get(id);

        if (timer) {
            clearTimeout(timer);
            battleTimers.delete(id);
        }

        return room;
    })();

    // Register the operation before another call can start one.
    finalizationLocks.set(id, finalizationPromise);

    try {
        return await finalizationPromise;
    } finally {
        // Remove only this operation's lock.
        if (finalizationLocks.get(id) === finalizationPromise) {
            finalizationLocks.delete(id);
        }
    }
};

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

    if (room.status !== "Waiting") {
        throw new Error("This battle has already started or ended.");
    }

    if (!room.quiz) {
        throw new Error("Select a quiz before starting the battle.");
    }

    const quiz = await Quiz.findById(room.quiz);

    if (!quiz) {
        throw new Error("Quiz Not Found");
    }

    const activePlayers = getActivePlayers(room);

    if (activePlayers.length < 2) {
        throw new Error("At least two active players are required.");
    }

    // Store one fixed order so every player sees the same questions.
    const questions = await Question.find({
        quiz: room.quiz,
    })
        .select("_id marks")
        .sort({ createdAt: 1, _id: 1 });

    if (questions.length === 0) {
        throw new Error("Quiz Has No Questions");
    }

    const startedAt = new Date();

    // battleTime is seconds; quizDuration is minutes.
    const durationSeconds =
        Number(room.battleTime) > 0
            ? Number(room.battleTime)
            : (Number(quiz.quizDuration) || 20) * 60;

    const quizEndTime = new Date(
        startedAt.getTime() + durationSeconds * 1000
    );

    const totalMarks = questions.reduce(
        (total, question) => total + (Number(question.marks) || 0),
        0
    );

    for (const player of activePlayers) {
        let response = await Response.findOne({
            quiz: room.quiz,
            room: room._id,
            user: player.user,
        });

        if (response && response.submitted) {
            throw new Error(
                "A submitted response already exists for a player in this room."
            );
        }

        if (!response) {
            response = await Response.create({
                quiz: room.quiz,
                room: room._id,
                user: player.user,
                answers: [],
                totalQuestions: questions.length,
                totalMarks,
                quizDuration: durationSeconds / 60,
                durationSeconds,
                startedAt,
                obtainedMarks: 0,
                percentage: 0,
                submitted: false,
                autoSubmitted: false,
            });
        }

        player.responseId = response._id;
        player.score = 0;
    }

    room.status = "Started";
    room.isQuizStarted = true;
    room.isQuizEnded = false;
    room.startedAt = startedAt;
    room.quizEndTime = quizEndTime;
    room.quizDuration = durationSeconds;
    room.remainingTime = durationSeconds;
    room.currentQuestion = 0;
    room.currentQuestionStartTime = startedAt;
    room.questionOrder = questions.map((question) => question._id);
    room.totalQuestions = questions.length;
    room.timerMode = "QUIZ";
    room.endedAt = null;
    room.winner = null;

    await room.save();

    scheduleBattleEnd(room._id, quizEndTime);

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

    if (room.status !== "Started" || room.isQuizEnded) {
        throw new Error("The battle is not active.");
    }

    if (room.quizEndTime && Date.now() >= room.quizEndTime.getTime()) {
        const completedRoom = await finalizeBattle(room);

        return {
            completed: true,
            room: completedRoom,
        };
    }

    const questionOrder = room.questionOrder || [];

    if (room.currentQuestion + 1 >= questionOrder.length) {
        const completedRoom = await finalizeBattle(room);

        return {
            completed: true,
            room: completedRoom,
        };
    }

    room.currentQuestion += 1;
    room.currentQuestionStartTime = new Date();

    room.remainingTime = Math.max(
        0,
        Math.ceil((room.quizEndTime.getTime() - Date.now()) / 1000)
    );

    await room.save();

    return {
        completed: false,
        room,
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

    return finalizeBattle(room);
};

/*
====================================
Join Battle
====================================
*/

exports.joinBattleService = async (roomCode, userId) => {
    const room = await Room.findOne({ roomCode });

    if (!room) {
        throw new Error("Room Not Found");
    }

    if (room.status !== "Waiting" || room.isQuizStarted || room.isQuizEnded) {
        throw new Error("This room is no longer accepting players.");
    }

    const existingPlayer = room.players.find(
        (player) => player.user.toString() === userId.toString()
    );

    if (existingPlayer?.isRemoved) {
        throw new Error(
            "You were removed from this room and cannot rejoin."
        );
    }

    if (existingPlayer) {
        return room;
    }

    const activePlayers = getActivePlayers(room);

    if (activePlayers.length >= room.maxPlayers) {
        throw new Error("Room Full");
    }

    room.players.push({
        user: userId,
        isHost: false,
        isReady: false,
        isRemoved: false,
        score: 0,
    });

    await room.save();

    return room;
};


/*
====================================
Leave Battle
====================================
*/
exports.leaveBattleService = async (roomId, userId) => {
    const room = await Room.findById(roomId);

    if (!room) {
        throw new Error("Room Not Found");
    }

    if (room.status === "Completed") {
        throw new Error("The battle has already ended.");
    }

    const player = room.players.find(
        (entry) => entry.user.toString() === userId.toString()
    );

    if (!player || player.isRemoved) {
        throw new Error("Player Not Found");
    }

    // Keep the record so response history and scores remain linked.
    player.isRemoved = true;
    player.removedAt = new Date();
    player.isReady = false;

    await room.save();

    return room;
};

/*
====================================
Leaderboard
====================================
*/
exports.getLeaderboardService = async (roomId) => {
    const room = await Room.findById(roomId).populate(
        "players.user",
        "name email"
    );

    if (!room) {
        throw new Error("Room Not Found");
    }

    return room.players
        .filter((player) => !player.isRemoved)
        .sort((a, b) => b.score - a.score)
        .map((player, index) => ({
            rank: index + 1,
            user: player.user,
            score: player.score,
            isHost: player.isHost,
        }));
};

/*
====================================
Submit Answer Score
====================================
*/
exports.submitAnswerService = async (roomId, userId, obtainedMarks) => {
    const room = await Room.findById(roomId);

    if (!room) {
        throw new Error("Room Not Found");
    }

    if (
        room.status !== "Started" ||
        room.isQuizEnded ||
        (room.quizEndTime && Date.now() >= room.quizEndTime.getTime())
    ) {
        if (room.status === "Started") {
            await finalizeBattle(room);
        }

        throw new Error("The battle deadline has passed or the battle has ended.");
    }

    const player = room.players.find(
        (entry) => entry.user.toString() === userId.toString()
    );

    if (!player || player.isRemoved) {
        throw new Error("Active player not found.");
    }

    if (!Number.isFinite(Number(obtainedMarks)) || Number(obtainedMarks) < 0) {
        throw new Error("Invalid marks.");
    }

    // This method updates the score only; it does not store a submission.
    // Call it only after the controller has validated and saved the answer.
    player.score = Number(player.score || 0) + Number(obtainedMarks);

    await room.save();

    return player;
};

// ====================================
// Restore Active Battle Timers
// ====================================

exports.restoreActiveBattleTimers = async () => {
    try {
        const activeRooms = await Room.find({
            status: "Started",
            isQuizStarted: true,
            isQuizEnded: false,
            quizEndTime: { $ne: null },
        }).select("_id quizEndTime");

        for (const room of activeRooms) {
            // If the deadline passed while the server was offline,
            // the timer will run immediately and finalize the battle.
            scheduleBattleEnd(room._id, room.quizEndTime);
        }

        console.log(
            `Battle timer recovery complete: ${activeRooms.length} active battle(s) found.`
        );

        return activeRooms.length;
    } catch (error) {
        console.error("Failed to restore active battle timers:", error);
        throw error;
    }
};
