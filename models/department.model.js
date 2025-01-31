const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const DepartmentSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    logo: { type: String },
    jobId: { type: Object },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const DepartmentModel = mongoose.model("departments", DepartmentSchema);

module.exports = DepartmentModel;
