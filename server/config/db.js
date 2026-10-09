
const mongoose = require("mongoose");

async function connectDB() {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
        throw new Error("MONGO_URI is missing from the environment.");
    }

    mongoose.set("strictQuery", true);

    const connection = await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 10000,
    });

    console.log(
        `MongoDB connected: ${connection.connection.name}`
    );

    return connection;
}

module.exports = connectDB;
