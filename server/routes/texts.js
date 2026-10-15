const express = require('express');
const Text = require('../models/Text');
const { isConnected } = require('../database/config');
const defaultTexts = require('../../database/defaultTexts');

const router = express.Router();

// GET /api/texts — list of training texts (DB, or built-in fallback)
router.get('/', async (req, res) => {
  try {
    if (isConnected()) {
      const texts = await Text.find().lean();
      if (texts.length) return res.json(texts);
    }
    res.json(defaultTexts.map((t, i) => ({ _id: `default-${i}`, ...t })));
  } catch (err) {
    console.error('[texts]', err.message);
    res.status(500).json({ error: 'Failed to load texts' });
  }
});

module.exports = router;
