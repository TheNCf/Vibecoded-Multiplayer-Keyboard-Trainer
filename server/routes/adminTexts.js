const express = require('express');
const mongoose = require('mongoose');
const Text = require('../models/Text');
const { isConnected } = require('../database/config');
const { verifyAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(verifyAdmin);

const LEVELS = ['easy', 'medium', 'hard'];
const LANGS = ['ru', 'en'];

function validate(body) {
  const title = String(body.title || '').trim();
  const content = String(body.content || '').trim();
  const lang = String(body.lang || 'ru');
  const level = String(body.level || 'easy');
  const errors = [];
  if (!title) errors.push('title is required');
  if (!content) errors.push('content is required');
  if (!LANGS.includes(lang)) errors.push('lang must be ru or en');
  if (!LEVELS.includes(level)) errors.push('level must be easy, medium or hard');
  return { errors, data: { title, content, lang, level } };
}

function requireDb(req, res, next) {
  if (!isConnected()) {
    return res.status(503).json({ error: 'База данных недоступна — тексты нельзя редактировать' });
  }
  next();
}

// Notify connected clients that the text list changed
function notifyTextsChanged(req) {
  const io = req.app.get('io');
  if (io) io.emit('texts:changed');
}

// GET /api/admin/texts — list all texts
router.get('/', requireDb, async (req, res) => {
  try {
    const texts = await Text.find().sort({ lang: 1, level: 1, title: 1 }).lean();
    res.json(texts);
  } catch (err) {
    console.error('[admin-texts] list failed:', err.message);
    res.status(500).json({ error: 'Не удалось загрузить тексты' });
  }
});

// POST /api/admin/texts — create
router.post('/', requireDb, async (req, res) => {
  const { errors, data } = validate(req.body || {});
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });
  try {
    const existing = await Text.findOne({ title: data.title });
    if (existing) return res.status(409).json({ error: 'Текст с таким заголовком уже существует' });
    const created = await Text.create(data);
    notifyTextsChanged(req);
    res.status(201).json(created);
  } catch (err) {
    console.error('[admin-texts] create failed:', err.message);
    res.status(500).json({ error: 'Не удалось создать текст' });
  }
});

// PUT /api/admin/texts/:id — update
router.put('/:id', requireDb, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Некорректный id' });
  }
  const { errors, data } = validate(req.body || {});
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });
  try {
    const duplicate = await Text.findOne({ title: data.title, _id: { $ne: req.params.id } });
    if (duplicate) return res.status(409).json({ error: 'Текст с таким заголовком уже существует' });
    const updated = await Text.findByIdAndUpdate(req.params.id, { $set: data }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Текст не найден' });
    notifyTextsChanged(req);
    res.json(updated);
  } catch (err) {
    console.error('[admin-texts] update failed:', err.message);
    res.status(500).json({ error: 'Не удалось сохранить текст' });
  }
});

// DELETE /api/admin/texts/:id — delete
router.delete('/:id', requireDb, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Некорректный id' });
  }
  try {
    const removed = await Text.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ error: 'Текст не найден' });
    notifyTextsChanged(req);
    res.json({ ok: true, removed: String(removed._id) });
  } catch (err) {
    console.error('[admin-texts] delete failed:', err.message);
    res.status(500).json({ error: 'Не удалось удалить текст' });
  }
});

module.exports = router;
