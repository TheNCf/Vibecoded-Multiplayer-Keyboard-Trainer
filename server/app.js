require('dotenv').config();

const os = require('os');
const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const { connectDB } = require('./database/config');
const RoundManager = require('./rounds');
const { ensureSeedData } = require('../database/seedData');

const textsRouter = require('./routes/texts');
const usersRouter = require('./routes/users');
const adminRouter = require('./routes/admin');
const adminTextsRouter = require('./routes/adminTexts');
const resultsRouter = require('./routes/results');
const createRoundsRouter = require('./routes/rounds');

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

// Best-effort LAN IP for log hints. In Docker this is the container IP, so
// NETWORK_IP from .env takes priority there.
function detectLanIp() {
  const nets = os.networkInterfaces();
  const candidates = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        candidates.push({ name, address: net.address });
      }
    }
  }
  const preferred =
    candidates.find((c) => c.name.startsWith('en') && /^192\.168\./.test(c.address)) ||
    candidates.find((c) => c.name.startsWith('en')) ||
    candidates.find((c) => /^192\.168\./.test(c.address)) ||
    candidates[0];
  return preferred ? preferred.address : 'localhost';
}

const LAN_IP = process.env.NETWORK_IP || detectLanIp();

const app = express();
const server = http.createServer(app);
// Allow cross-origin clients (e.g. frontend opened from another host/port).
const io = new Server(server, { cors: { origin: true, methods: ['GET', 'POST'] } });

app.use(express.json());

// CORS for the REST API (reflects the request origin; JWT is sent via header, not cookies)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Static interfaces
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));
app.use('/user', express.static(path.join(__dirname, '..', 'user')));
app.use('/public', express.static(path.join(__dirname, '..', 'public')));
// Socket.IO client served locally (no CDN — works on Wi-Fi without internet)
app.use(
  '/vendor',
  express.static(path.join(__dirname, '..', 'node_modules', 'socket.io', 'client-dist'))
);

// API
const roundManager = new RoundManager(io);
app.set('io', io);
app.use('/api/texts', textsRouter);
app.use('/api/users', usersRouter);
app.use('/api/admin/texts', adminTextsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/results', resultsRouter);
app.use('/api/rounds', createRoundsRouter(roundManager));

app.get('/', (req, res) => {
  res.redirect('/user/');
});

// Realtime: students send batches of correct chars
io.on('connection', (socket) => {
  // Late joiners get the current session state immediately
  socket.emit('round:state', roundManager.current());

  socket.on('type', (payload) => {
    if (!payload || typeof payload !== 'object') return;
    roundManager.addTyping({
      userId: String(payload.userId || ''),
      alias: String(payload.alias || ''),
      chars: Number(payload.chars) || 0,
      cpm: Number(payload.cpm) || 0,
      accuracy: Number(payload.accuracy) || 0
    });
  });
});

connectDB(process.env.DB_URI).then(async (connected) => {
  if (connected && process.env.AUTO_SEED === 'true') {
    try {
      await ensureSeedData({ withDemoUser: process.env.SEED_DEMO_USER === 'true' });
    } catch (err) {
      console.error('[seed] auto-seed failed:', err.message);
    }
  }

  server.listen(PORT, HOST, () => {
    console.log('--------------------------------------------');
    console.log('  Keyboard Trainer server running');
    console.log(`  Local:   http://localhost:${PORT}/user`);
    console.log(`  Network: http://${LAN_IP}:${PORT}/user`);
    console.log(`  Admin:   http://${LAN_IP}:${PORT}/admin`);
    if (process.env.NETWORK_IP) {
      console.log('  (address from NETWORK_IP — use the current Wi-Fi IP)');
    } else {
      console.log('  (auto-detected LAN IP)');
    }
    console.log('--------------------------------------------');
  });
});
