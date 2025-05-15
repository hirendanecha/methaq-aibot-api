const mongoose = require('mongoose');
const { Schema } = mongoose;

const MessageTemplateSchema = new Schema({
    name: {
      type: String,
      required: true,
      index: 'text',
      trim: true,
    },
    category: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    arabicText: {
      type: String,
      required: true,
      trim: true,
    },
    englishText: {
      type: String,
      required: true,
      trim: true,
    },
    usageCount: {
      type: Number,
      default: 0,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'user',
      required: true,
    },
  }, {
    timestamps: true,
    versionKey: false,
  });
  
  module.exports = mongoose.model('MessageTemplate', MessageTemplateSchema);