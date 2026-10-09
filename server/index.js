const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

dotenv.config();

const connectDB = require("./config/db");
const allRoutes = require("./route/allRoutes");
const {
    restoreActiveBattleTimers,
} = require("./service/battleService");

const app = express();
const server = http.createServer(app);

const allowedOrigins = (
    process.env.FRONTEND_URL || "http://localhost:5173"
)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const corsOptions = {
    origin(origin, callback) {
        // Permit requests without an Origin header, such as health checks.
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error("Origin is not allowed by CORS."));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
};

const io = new Server(server, {
    cors: corsOptions,
});

app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Basic server health check.
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "QuizArena API is running.",
    });
});

// API routes.
app.use("/api", allRoutes);

// Unknown API routes.
app.use("/api", (req, res) => {
    res.status(404).json({
        success: false,
        message: `API route not found: ${req.method} ${req.originalUrl}`,
    });
});

// Unknown non-API routes.
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found.",
    });
});

// Central error handler.
app.use((error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }

    if (error.type === "entity.parse.failed") {
        return res.status(400).json({
            success: false,
            message: "Invalid JSON request body.",
        });
    }

    if (error.message === "Origin is not allowed by CORS.") {
        return res.status(403).json({
            success: false,
            message: error.message,
        });
    }

    console.error("Server error:", error.message);

    return res.status(error.status || 500).json({
        success: false,
        message:
            process.env.NODE_ENV === "production"
                ? "An unexpected server error occurred."
                : error.message || "Internal server error.",
    });
});

// Initialize Socket.IO handlers.
require("./socket/socket")(io);

// Start the server only after MongoDB connects successfully.
const PORT = Number(process.env.PORT) || 9000;

async function startServer() {
    try {
        await connectDB();

        // Restore timers for battles active before the server restarted.
        await restoreActiveBattleTimers();

        server.listen(PORT, () => {
            console.log(`QuizArena API running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Backend startup failed:", error.message);
        process.exit(1);
    }
}

// IMPORTANT: Call startServer only once.
startServer();

module.exports = { app, server, io };