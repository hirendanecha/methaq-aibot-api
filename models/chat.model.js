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
      ref: "departments",
      default: "67b459b237e1e5b6d7c06593"
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
    source:{
      type:String,
      enum:["whatsapp","bot"],
      default:"bot"
    },
    status: {
      type: String,
      enum: constants.chatStatus,
      default: "active"
    },
  }
);

const ChatModel = mongoose.model("chat", ChatSchema);

module.exports = ChatModel;