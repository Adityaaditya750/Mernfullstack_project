// server/route/allRoutes.js

const express = require("express");
const router = express.Router();

const authRoutes = require("./authRoutes");
const quizRoutes = require("./QuizRoute");
const questionRoutes = require("./questionRoutes");
const responseRoute = require("./responseRoute");
const roomRoutes = require("./roomRoute");
const friendRoutes = require("./friendRoutes");

router.use("/auth", authRoutes);
router.use("/quiz", quizRoutes);
router.use("/question", questionRoutes);
router.use("/submit", responseRoute);
router.use("/room", roomRoutes);
router.use("/friends", friendRoutes);

module.exports = router;