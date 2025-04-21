const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const DepartmentSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    logo: { type: String },
    jobId: { type: Object },
    depId: { type: String },
    messages: {
      afterHoursResponse: { type: String },
      allAgentsOfflineResponse: { type: String },
      chatClosingMessage: { type: String },
    },
    prompt: { type: String, default: "" },
    workingHours: {
      startTime: { type: String },
      endTime: { type: String },
    },
    assistantName: { type: String },
    assistantDetails: {
      id: { type: String },
      vectorId: { type: String },
      qaFileId: { type: String },
      documentIds: [{ type: String }],
      name: { type: String },
      createdAt: { type: String },
    },
    functionId: [{ type: String }],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const DepartmentModel = mongoose.model("departments", DepartmentSchema);

module.exports = DepartmentModel;
