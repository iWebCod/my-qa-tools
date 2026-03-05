const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));

// Active WS clients
const clients = new Set();
wss.on('connection', (ws) => {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
});

// Broadcast log to all connected clients
function broadcast(data) {
  const msg = JSON.stringify(data);
  clients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  });
}

// Make broadcast available globally
global.broadcast = broadcast;

// Routes
app.use('/api/run', require('./routes/run'));
app.use('/api/config', require('./routes/config'));

// Health check
app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`XIDBOX QA Backend running on port ${PORT}`);
  console.log(`UI: http://localhost:${PORT}`);
});
