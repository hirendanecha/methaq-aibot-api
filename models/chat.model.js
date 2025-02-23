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
    // isArchived: { type: Boolean, default: false },
    status: {
      type: String,
      enum: constants.chatStatus,
      default: "active"
    },
  }
);

const ChatModel = mongoose.model("chat", ChatSchema);

module.exports = ChatModel;