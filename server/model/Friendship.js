const mongoose = require("mongoose");

const friendshipSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
      required: true,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

friendshipSchema.index(
  { requester: 1, recipient: 1 },
  { unique: true }
);

module.exports = mongoose.model("Friendship", friendshipSchema);