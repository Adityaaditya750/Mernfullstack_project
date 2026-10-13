
const mongoose = require("mongoose");
const User = require("./model/User");
require("dotenv").config();

const createBaseUsername = (name) => {
  const base = String(name || "player")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 14);

  return base || "player";
};

async function migrateUsernames() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB Atlas");

    const users = await User.find({
      $or: [
        { username: { $exists: false } },
        { username: null },
        { username: "" },
      ],
    }).select("_id name username");

    console.log(`Users needing usernames: ${users.length}`);

    for (const user of users) {
      const base = createBaseUsername(user.name);
      let username;
      let attempt = 0;

      do {
        const suffix =
          attempt === 0
            ? Math.random().toString(36).slice(2, 7)
            : `${attempt}${Math.random().toString(36).slice(2, 5)}`;

        username = `${base.slice(0, 20 - suffix.length)}${suffix}`;
        attempt++;
      } while (
        await User.exists({
          username,
          _id: { $ne: user._id },
        })
      );

      await User.updateOne(
        { _id: user._id },
        { $set: { username } }
      );

      console.log(`Updated user ${user._id}: ${username}`);
    }

    console.log("Username migration completed.");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

migrateUsernames();
