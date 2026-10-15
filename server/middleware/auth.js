const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || process.env.ADMIN_PASSWORD || 'keyboard-trainer-dev-secret';

function signAdminToken() {
  return jwt.sign({ role: 'admin' }, SECRET, { expiresIn: '12h' });
}

function verifyAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const payload = jwt.verify(token, SECRET);
    if (payload.role !== 'admin') throw new Error('wrong role');
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { signAdminToken, verifyAdmin };
