const mongoose = require("mongoose");

const qnaSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
    department: { type: mongoose.Types.ObjectId, ref: "departments" },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const QnaModel = mongoose.model("QnA", qnaSchema);

module.exports = QnaModel;
