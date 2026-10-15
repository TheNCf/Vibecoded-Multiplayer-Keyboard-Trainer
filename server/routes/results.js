const express = require('express');
const progressService = require('../services/progressService');

const router = express.Router();

// Placeholder for the future per-student progress feature.
// Enabled later by implementing services/progressService.js.
router.get('/', async (req, res) => {
  const history = await progressService.getHistory(req.query.userId);
  res.json({ supported: false, history });
});

// POST /api/results — attempt finished; stored only when the future
// progress feature is enabled in progressService.
router.post('/', async (req, res) => {
  const { userId, textId, cpm, accuracy, typedChars, errors, duration } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  await progressService.recordAttempt({
    userId,
    textId,
    cpm: Number(cpm) || 0,
    accuracy: Number(accuracy) || 0,
    typedChars: Number(typedChars) || 0,
    errors: Number(errors) || 0,
    duration: Number(duration) || 0
  });
  res.json({ ok: true, stored: false });
});

module.exports = router;
