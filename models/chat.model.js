const mongoose = require("mongoose");

const ChatSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  agentId: { type: String, required: false }, // Initially null for AI
  department: { type: String, required: true }, // Default to "AI" and can be updated,
  isHandshakeRequested: { type: Boolean, default: false }, // Flag to check if handshake is requested
  isHuman: { type: Boolean, default: false }, // Flag to check if human is handling
  messages: [
    {
      sender: { type: String, required: true }, // user or agent
      content: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
      messageType: { type: String, default: "text" }, // text or richContent
    },
  ],
  transferLog: [
    {
      transferredBy: { type: String },
      transferredTo: { type: String },
      transferFromDepartment: { type: String },
      timestamp: { type: Date, default: Date.now },
    },
  ],
});

module.exports = mongoose.model("Chat", ChatSchema);