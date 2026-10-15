const Round = require('../models/Round');
const { isConnected } = require('../database/config');

// In-memory fallback archive keeps the app usable when DB_URI is not set.
const memoryArchive = [];
const MEMORY_LIMIT = 200;

async function saveRound(snapshot) {
  if (isConnected()) {
    const doc = await Round.create(snapshot);
    return doc.toObject();
  }
  const doc = { _id: `mem-${Date.now()}`, ...snapshot };
  memoryArchive.unshift(doc);
  if (memoryArchive.length > MEMORY_LIMIT) memoryArchive.pop();
  return doc;
}

async function listArchive(limit = 100) {
  if (isConnected()) {
    return Round.find().sort({ finishedAt: -1 }).limit(limit).lean();
  }
  return memoryArchive.slice(0, limit);
}

module.exports = { saveRound, listArchive };
