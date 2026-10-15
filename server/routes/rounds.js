const express = require('express');
const { verifyAdmin } = require('../middleware/auth');
const roundService = require('../services/roundService');

// roundManager is injected from app.js
function createRoundsRouter(roundManager) {
  const router = express.Router();

  // POST /api/rounds/start — begin a new session (admin)
  router.post('/start', verifyAdmin, (req, res) => {
    res.json(roundManager.start());
  });

  // POST /api/rounds/finish { label } — finish + autosave snapshot (admin)
  router.post('/finish', verifyAdmin, async (req, res) => {
    const label = String(req.body.label || '').trim();
    if (!label) {
      return res.status(400).json({ error: 'label (session name) is required' });
    }
    const snapshot = roundManager.finish(label);
    if (!snapshot) {
      return res.status(400).json({ error: 'No active session to finish' });
    }
    try {
      const saved = await roundService.saveRound(snapshot);
      res.json({ ok: true, saved });
    } catch (err) {
      console.error('[rounds] save failed:', err.message);
      res.status(500).json({ error: 'Failed to save session' });
    }
  });

  // GET /api/rounds/current — current session state
  router.get('/current', (req, res) => {
    res.json(roundManager.current());
  });

  // GET /api/rounds/archive — list of saved sessions, newest first (admin)
  router.get('/archive', verifyAdmin, async (req, res) => {
    try {
      res.json(await roundService.listArchive());
    } catch (err) {
      console.error('[rounds] archive failed:', err.message);
      res.status(500).json({ error: 'Failed to load archive' });
    }
  });

  return router;
}

module.exports = createRoundsRouter;
