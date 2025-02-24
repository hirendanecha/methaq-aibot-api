const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: "chat", required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "customers", default: null }, // Example: "user" or "bot"
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null },
  sendType: { type: String, enum: ["assistant", "user", "admin"], default: "assistant" },
  receiverType: { type: String, enum: ["assistant", "user", "admin"], default: "user" },
  content: { type: String, default: "" },
  attachments: [{ type: String }],
  isSeen: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
});

const MessageModel = mongoose.model("Message", messageSchema);

module.exports = MessageModel;
