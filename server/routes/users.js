const express = require('express');
const User = require('../models/User');
const { isConnected } = require('../database/config');

const router = express.Router();

// In-memory fallback when DB is offline (logins lost on restart)
const memoryUsers = new Map(); // `${alias}|${code}` -> { _id, alias, code }

// POST /api/users/login { alias, code } — first login registers the student
router.post('/login', async (req, res) => {
  const alias = String(req.body.alias || '').trim();
  const code = String(req.body.code || '').trim();
  if (!alias || !code) {
    return res.status(400).json({ error: 'alias and code are required' });
  }
  if (alias.length > 24) {
    return res.status(400).json({ error: 'alias is too long (max 24)' });
  }

  try {
    if (isConnected()) {
      let user = await User.findOne({ alias });
      if (user) {
        if (user.code !== code) {
          return res.status(401).json({ error: 'Неверный код доступа' });
        }
      } else {
        user = await User.create({ alias, code });
      }
      return res.json({ userId: String(user._id), alias: user.alias });
    }

    const key = `${alias}|${code}`;
    let user = memoryUsers.get(key);
    if (!user) {
      const aliasTaken = [...memoryUsers.values()].some((u) => u.alias === alias);
      if (aliasTaken) {
        return res.status(401).json({ error: 'Неверный код доступа' });
      }
      user = { _id: `mem-${memoryUsers.size + 1}`, alias, code };
      memoryUsers.set(key, user);
    }
    res.json({ userId: user._id, alias: user.alias });
  } catch (err) {
    console.error('[users]', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
