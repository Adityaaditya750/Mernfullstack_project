const battleSocket = require("./battleSocket");

module.exports = (io) => {

    console.log("✅ Socket.IO Initialized");

    io.on("connection", (socket) => {

        console.log(`🟢 User Connected : ${socket.id}`);

        /*
        ====================================
        Battle Events
        ====================================
        */

        battleSocket(io, socket);

        /*
        ====================================
        Disconnect
        ====================================
        */

        socket.on("disconnect", () => {

            console.log(`🔴 User Disconnected : ${socket.id}`);

        });

    });

};