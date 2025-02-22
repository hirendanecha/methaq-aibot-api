const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ChatSchema = Schema({
  adminId: { type: Schema.Types.ObjectId, ref: "users", default: null }, // Initially null for AI
  customerId: { type: Schema.Types.ObjectId, ref: "customers" }, // Initially null for AI
  latestMessage: { type: Schema.Types.ObjectId, ref: "message", default: null },
  isHuman: { type: Boolean, default: false }, // Flag to check if human is handling
});

const ChatModel = mongoose.model("chat", ChatSchema);

module.exports = ChatModel;