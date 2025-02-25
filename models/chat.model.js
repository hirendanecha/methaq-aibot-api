const mongoose = require("mongoose");
const constants = require("../utils/constants");
const Schema = mongoose.Schema;

const ChatSchema = Schema(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      default: null
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: "departments"
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "customers"
    },
    latestMessage: {
      type: Schema.Types.ObjectId,
      ref: "Message",
      default: null
    },
    isHuman: {
      type: Boolean,
      default: false
    },
    notes: [{
      type: String
    }],
    status: {
      type: String,
      enum: constants.chatStatus,
      default: "active"
    },
  }
);

const ChatModel = mongoose.model("chat", ChatSchema);

module.exports = ChatModel;