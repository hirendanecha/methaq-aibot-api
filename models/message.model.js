const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sender: { type: String, required: true }, // Example: "user" or "bot"
  content: { type: String, required: true },
  type: { type: String, default: "text" }, // Example: "text" or "custom"
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Message", messageSchema);
