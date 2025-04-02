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
    depId: {
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
    chatTime: {
      type: Number,
      default: null,
    },
    agentTransferedAt: {
      type: Date,
      default: null
    },
    agentHandledAt: {
      type: Date,
      default: null,
    },
    initialHandlingTime: {
      type: Number,
      default: null
    },
    tags: [
      {
        type: String,
        enum: constants.chatTags,
        default: "pending",
      },
    ],
  },
  {
    timestamps: true,
  }
);

const ChatModel = mongoose.model("chat", ChatSchema);

module.exports = ChatModel;
