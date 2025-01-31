const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const uploadSchema = new Schema(
  {
    department: { type: mongoose.Types.ObjectId, ref: "departments" },
    file: {
      type: Object,
    },
    url: {
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
