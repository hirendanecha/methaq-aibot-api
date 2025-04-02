const mongoose = require("mongoose");
const constants = require("../utils/constants");

const Schema = mongoose.Schema;

const uploadSchema = new Schema(
  {
    department: { type: mongoose.Types.ObjectId, ref: "departments" },
    assistantDocId: { type: String },
    file: {
      type: Object,
    },
    url: {
      type: String,
    },
    status: {
      type: String,
      enum: constants.status.status,
      default: constants.status.statusObj.pending,
    },
    content: {
      type: String,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const UploadModel = mongoose.model("uploads", uploadSchema);

module.exports = UploadModel;
