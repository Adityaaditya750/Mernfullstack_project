
const jwt = require("jsonwebtoken");
const User = require("../model/User");

const socketAuth = async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, "");

    if (!token) {
      return next(new Error("Authentication required. Please log in."));
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured.");
      return next(new Error("Server authentication is not configured."));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select(
      "_id name email role"
    );

    if (!user) {
      return next(new Error("User account not found. Please log in again."));
    }

    // Store the verified database user on the socket.
    socket.user = user;

    return next();
  } catch (error) {
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError" ||
      error.name === "NotBeforeError"
    ) {
      return next(new Error("Invalid or expired token. Please log in again."));
    }

    console.error("Socket authentication error:", error.message);
    return next(new Error("Socket authentication failed."));
  }
};

module.exports = socketAuth;
