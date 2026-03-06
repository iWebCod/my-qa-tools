const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT) || 3001;

const defaultOrigins = [
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`,
];
const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || defaultOrigins.join(','))
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);

const allowOrigin = (origin) => !origin || allowedOrigins.has(origin);

app.disable('x-powered-by');
app.use(cors({
  origin(origin, cb) {
    if (allowOrigin(origin)) return cb(null, true);
    return cb(new Error('CORS blocked for origin')); 
  },
}));
app.use(express.json({ limit: '256kb' }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));

const wss = new WebSocket.Server({ server, maxPayload: 256 * 1024 });

// Active WS clients
const clients = new Set();
wss.on('connection', (ws, req) => {
  const origin = req.headers.origin;
  if (!allowOrigin(origin)) {
    ws.close(1008, 'Origin not allowed');
    return;
  }

  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
});

// Broadcast log to all connected clients
function broadcast(data) {
  const msg = JSON.stringify(data);
  clients.forEach((ws) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    try {
      ws.send(msg);
    } catch (_) {
      clients.delete(ws);
    }
  });
}

// Make broadcast available globally
global.broadcast = broadcast;

// Routes
app.use('/api/run', require('./routes/run'));
app.use('/api/config', require('./routes/config'));

// Health check
app.get('/health', (req, res) => res.json({ ok: true }));

server.listen(PORT, () => {
  console.log(`XIDBOX QA Backend running on port ${PORT}`);
  console.log(`UI: http://localhost:${PORT}`);
  console.log(`Allowed origins: ${Array.from(allowedOrigins).join(', ')}`);
});
