// POST /api/events  — analytics event ingest from the site
// Receives events fired by js/events.js and writes to data/events.json.
'use strict';

const router = require('express').Router();
const fs     = require('fs');
const path   = require('path');

const EVENTS_FILE = path.join(__dirname, '..', '..', 'data', 'events.json');

function readJson(file, fallback = []) {
  try   { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}

router.post('/', (req, res) => {
  const ev = req.body;
  if (!ev || !ev.t) return res.status(400).json({ error: 'Event type (t) required.' });

  // Strip anything that looks like PII beyond what we need
  const safe = {
    t:       String(ev.t).slice(0, 64),
    page:    String(ev.page  || '').slice(0, 256),
    session: String(ev.session || '').slice(0, 64),
    ts:      ev.ts || new Date().toISOString(),
    meta:    ev.meta && typeof ev.meta === 'object' ? ev.meta : {},
  };

  const events = readJson(EVENTS_FILE);
  events.push(safe);

  // Cap file at 10,000 events — older events are archived to events.archive.json
  if (events.length > 10000) {
    const archive     = readJson(path.join(path.dirname(EVENTS_FILE), 'events.archive.json'));
    const overflow    = events.splice(0, events.length - 10000);
    archive.push(...overflow);
    fs.writeFileSync(
      path.join(path.dirname(EVENTS_FILE), 'events.archive.json'),
      JSON.stringify(archive, null, 2) + '\n'
    );
  }

  fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2) + '\n', 'utf8');
  res.json({ ok: true });
});

module.exports = router;
