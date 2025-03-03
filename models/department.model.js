const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const DepartmentSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    logo: { type: String },
    jobId: { type: Object },
    messages: {
      afterHoursResponse: { type: String },
      allAgentsOfflineResponse: { type: String },
      chatClosingMessage: { type: String }
    },
    prompt: { type: String },
    workingHours: {
      startTime: { type: String },
      endTime: { type: String }
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const DepartmentModel = mongoose.model("departments", DepartmentSchema);

module.exports = DepartmentModel;
