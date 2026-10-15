const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    alias: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

userSchema.index({ alias: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);
