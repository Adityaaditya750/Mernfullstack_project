
const timers = new Map();

exports.startTimer = (io, roomCode, duration, onFinish) => {
  // Prevent duplicate intervals for this room.
  exports.stopTimer(roomCode);

  let timeLeft = Math.max(0, Math.floor(Number(duration) || 0));

  const emitTime = () => {
    io.to(roomCode).emit("timer", { timeLeft });
  };

  emitTime();

  if (timeLeft <= 0) {
    io.to(roomCode).emit("timer-ended");
    onFinish?.();
    return;
  }

  const interval = setInterval(() => {
    timeLeft -= 1;
    emitTime();

    if (timeLeft <= 0) {
      exports.stopTimer(roomCode);
      io.to(roomCode).emit("timer-ended");
      onFinish?.();
    }
  }, 1000);

  timers.set(roomCode, interval);
};

exports.stopTimer = (roomCode) => {
  const interval = timers.get(roomCode);

  if (interval) {
    clearInterval(interval);
    timers.delete(roomCode);
  }
};
