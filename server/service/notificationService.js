const Notification = require("../model/Notification");

async function createNotification(io, details) {
  const notification = await Notification.create(details);
  const populated = await notification.populate("actor", "name username");
  const result = populated.toObject();

  if (io && details.recipient) {
    io.to(`user:${String(details.recipient)}`).emit(
      "notification-received",
      result
    );
  }

  return result;
}

module.exports = { createNotification };
