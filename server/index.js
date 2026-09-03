const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const connectDB = require("./config/db");

dotenv.config();

/*
====================================
Database
====================================
*/

connectDB();

/*
====================================
Express
====================================
*/

const app = express();

const server = http.createServer(app);

/*
====================================
Socket.IO
====================================
*/

const io = new Server(server, {

    cors: {

        origin: "*",

        methods: ["GET", "POST", "PUT", "DELETE"]

    }

});

/*
====================================
Middlewares
====================================
*/

app.use(cors());

app.use(express.json());

/*
====================================
Routes
====================================
*/

const allRoutes = require("./route/allRoutes");

app.use("/api", allRoutes);

/*
====================================
Home
====================================
*/

app.get("/", (req, res) => {

    res.send("Quiz API Running...");

});

/*
====================================
Socket Setup
====================================
*/

require("./socket/socket")(io);

/*
====================================
Start Server
====================================
*/

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {

    console.log(`🚀 Server running on port ${PORT}`);

});