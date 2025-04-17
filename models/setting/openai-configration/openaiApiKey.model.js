// models/openaiApiKey.model.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const OpenAIApiKeySchema = new Schema(
  {
    apiKey: { type: String, required: true },
    iv: { type: String, required: true },
    verified: { type: Boolean, default: false },
    lastUpdated: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

const OpenAIApiKeyModel = mongoose.model(
  "OpenAIApiKeyConfig",
  OpenAIApiKeySchema
);

module.exports = OpenAIApiKeyModel;
