const mongoose = require('mongoose');

// Snapshot of a finished round (session). Aggregates only + session label.
// participants[].userId is the hook for a future per-student progress feature.
const roundSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date, default: Date.now },
    totalChars: { type: Number, default: 0 },
    participantsCount: { type: Number, default: 0 },
    avgCpm: { type: Number, default: 0 },
    avgAccuracy: { type: Number, default: 0 },
    participants: [
      {
        alias: { type: String, required: true },
        userId: { type: String, required: true },
        chars: { type: Number, default: 0 },
        cpm: { type: Number, default: 0 },
        accuracy: { type: Number, default: 0 },
        share: { type: Number, default: 0 }
      }
    ]
  },
  { versionKey: false }
);

roundSchema.index({ finishedAt: -1 });

module.exports = mongoose.model('Round', roundSchema);
