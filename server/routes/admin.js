const express = require('express');
const User = require('../models/User');
const { isConnected } = require('../database/config');
const { signAdminToken, verifyAdmin } = require('../middleware/auth');
const roundService = require('../services/roundService');

const router = express.Router();

// POST /api/admin/login { password }
router.post('/login', (req, res) => {
  const password = String(req.body.password || '');
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD is not set on the server' });
  }
  if (password !== expected) {
    return res.status(401).json({ error: 'Неверный пароль' });
  }
  res.json({ token: signAdminToken() });
});

// GET /api/admin/stats — dashboard aggregates
router.get('/stats', verifyAdmin, async (req, res) => {
  try {
    const archive = await roundService.listArchive(1000);

    let students = 0;
    if (isConnected()) {
      students = await User.countDocuments();
    } else {
      students = 0;
    }

    const rounds = archive.length;
    const sum = (fn) => archive.reduce((s, r) => s + (fn(r) || 0), 0);
    const avg = (fn) => (rounds ? Math.round(sum(fn) / rounds) : 0);

    res.json({
      students,
      rounds,
      totalChars: sum((r) => r.totalChars),
      avgCpm: avg((r) => r.avgCpm ?? (r.avgWpm ? r.avgWpm * 5 : 0)),
      avgAccuracy: avg((r) => r.avgAccuracy),
      totalParticipants: sum((r) => r.participantsCount)
    });
  } catch (err) {
    console.error('[admin] stats failed:', err.message);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

module.exports = router;
