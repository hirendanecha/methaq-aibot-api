const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ComplaintSchema = new Schema(
  {
    custid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "customers",
      // required: true,
    },
    complainNumber: {
      type: String,
      default: null
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "chat",
      // required: true,
    },
    complainType: { type: String, default: "" },
    customername: { type: String },
    complainComment: { type: String, default: "" },
    customeremail: { type: String },
    customerphone: { type: String },
    complaindesc: { type: String },
    complaindocuments: [{ type: String }], // Assuming documents are stored as URLs or file paths
    complainstatus: {
      type: String,
      enum: ["new", "in_progress", "closed"],
      default: "new",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const ComplaintModel = mongoose.model("complaints", ComplaintSchema);

module.exports = ComplaintModel;
