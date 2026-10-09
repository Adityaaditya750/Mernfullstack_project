
const jwt = require("jsonwebtoken");
const User = require("../model/User");

const protect = async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Not authorized. Please log in.",
    });
  }

  const token = authorization.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized. Token is missing.",
    });
  }

  try {
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured.");

      return res.status(500).json({
        success: false,
        message: "Server authentication is not configured.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "The account associated with this token no longer exists.",
      });
    }

    // Use the current database role rather than the role in the token.
    req.user = user;

    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError" ||
        error.name === "JsonWebTokenError" ||
        error.name === "NotBeforeError") {
      return res.status(401).json({
        success: false,
        message: "Your session is invalid or has expired. Please log in again.",
      });
    }

    console.error("Authentication middleware error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Authentication could not be completed.",
    });
  }
};

const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication is required.",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Administrator access is required.",
    });
  }

  return next();
};

module.exports = {
  protect,
  adminOnly,
};
