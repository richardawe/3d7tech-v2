// 3D7 Tech — VPS API server
// Start: node api/server.js
// Env vars: PORT (default 3001), NOTIFY_EMAIL, ADMIN_TOKEN
// Runs on the VPS alongside the static site (nginx proxies /api/* here).

'use strict';

const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const fs       = require('fs');

const app  = express();
const PORT = process.env.PORT || 3001;
const DATA = path.join(__dirname, '..', 'data');

// Ensure data dir exists
if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true });

app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: false }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/submit',  require('./routes/submit'));
app.use('/api/booking', require('./routes/booking'));
app.use('/api/token',   require('./routes/token'));
app.use('/api/events',  require('./routes/events'));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[API]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => console.log(`3D7 Tech API listening on port ${PORT}`));
