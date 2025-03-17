const mongoose = require("mongoose");
const constants = require("../utils/constants");
const Schema = mongoose.Schema;

const ChatSchema = Schema(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
    currentSessionId: {
      type: String,
      default: null,
    },
    sessionIds: {
      type: Object,
      default: {},
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: "departments",
      default: null,
    },
    typeBotId: {
      type: String,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "customers",
    },
    latestMessage: {
      type: Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    isHuman: {
      type: Boolean,
      default: false,
    },
    notes: [
      {
        type: String,
      },
    ],
    source: {
      type: String,
      enum: ["whatsapp", "bot"],
      default: "bot",
    },
    status: {
      type: String,
      enum: constants.chatStatus,
      default: "active",
    },
    tags: [
      {
        type: String,
        enum: constants.chatTags,
        default: "",
      },
    ],
  },
  {
    timestamps: true,
  }
);

const ChatModel = mongoose.model("chat", ChatSchema);

module.exports = ChatModel;
