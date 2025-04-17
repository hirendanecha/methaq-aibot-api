// models/setting/settings.model.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const SettingsSchema = new Schema(
  {
    _id: { type: Schema.Types.ObjectId, auto: true },
    rewritePrompt: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

const SettingsModel = mongoose.model("Settings", SettingsSchema);

module.exports = SettingsModel;
