
const socketAuth = require("../middleware/socketAuth");
const battleSocket = require("./battleSocket");

module.exports = (io) => {
  console.log("Socket.IO Initialized");

  // Authenticate every connection before registering battle events.
  io.use(socketAuth);

  io.on("connection", (socket) => {
    console.log(`User Connected: ${socket.id}, User: ${socket.user._id}`);

    // Register battle handlers only for authenticated users.
    battleSocket(io, socket);

    socket.on("disconnect", (reason) => {
      console.log(`User Disconnected: ${socket.id}, Reason: ${reason}`);
    });
  });
};
