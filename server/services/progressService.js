// Future per-student progress feature (not implemented in MVP).
// Calls are already wired into the trainer flow, so enabling progress later
// only requires implementing this service and creating a `results` collection.

async function recordAttempt({ userId, textId, cpm, accuracy, typedChars, errors, duration }) {
  // no-op: individual progress storage is intentionally disabled for now
}

async function getHistory(userId) {
  return [];
}

module.exports = { recordAttempt, getHistory };
