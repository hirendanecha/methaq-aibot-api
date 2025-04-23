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
      "0": { isAvailable: { type: Boolean, default: false }, startTime: { type: String, default: null }, endTime: { type: String, default: null } },
      "1": { isAvailable: { type: Boolean, default: false }, startTime: { type: String, default: null }, endTime: { type: String, default: null } },
      "2": { isAvailable: { type: Boolean, default: false }, startTime: { type: String, default: null }, endTime: { type: String, default: null } },
      "3": { isAvailable: { type: Boolean, default: false }, startTime: { type: String, default: null }, endTime: { type: String, default: null } },
      "4": { isAvailable: { type: Boolean, default: false }, startTime: { type: String, default: null }, endTime: { type: String, default: null } },
      "5": { isAvailable: { type: Boolean, default: false }, startTime: { type: String, default: null }, endTime: { type: String, default: null } },
      "6": { isAvailable: { type: Boolean, default: false }, startTime: { type: String, default: null }, endTime: { type: String, default: null } },
    },
    assistantName: { type: String },
    isParent: { type: Boolean, default: false },
    parentId: { type: String, default: null },
    holidays: [{ type: Date, default: [] }],
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
