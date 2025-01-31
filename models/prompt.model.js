const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const PromptSchema = new Schema(
  {
    department: { type: mongoose.Types.ObjectId, ref: "departments" },
    prompt: { type: String, required: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const PromptModel = mongoose.model("prompts", PromptSchema);

module.exports = PromptModel;
