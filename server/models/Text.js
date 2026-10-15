const mongoose = require('mongoose');

const textSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    level: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' },
    lang: { type: String, enum: ['ru', 'en'], default: 'ru' }
  },
  { versionKey: false }
);

module.exports = mongoose.model('Text', textSchema);
