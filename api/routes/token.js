// GET /api/token?token=UUID  — resolves outreach token to prospect context
// Used by token.js on the frontend to personalise the page.
'use strict';

const router = require('express').Router();
const fs     = require('fs');
const path   = require('path');

const ARTIFACTS_FILE = path.join(__dirname, '..', '..', 'data', 'artifacts.json');
const PROFILES_FILE  = path.join(__dirname, '..', '..', 'data', 'profiles.json');
const EVENTS_FILE    = path.join(__dirname, '..', '..', 'data', 'events.json');

function readJson(file, fallback = []) {
  try   { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}

function appendEvent(event) {
  const events = readJson(EVENTS_FILE, []);
  events.push({ ...event, ts: new Date().toISOString() });
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2) + '\n', 'utf8');
}

router.get('/', (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token required.' });

  const artifacts = readJson(ARTIFACTS_FILE);
  const artifact  = artifacts.find(a => a.token === token);
  if (!artifact) return res.status(404).json({ error: 'Token not found.' });

  const profiles = readJson(PROFILES_FILE);
  const profile  = profiles.find(p => p.prospect_id === artifact.prospect_id) || {};

  // Log the token visit event
  appendEvent({
    type:       'token_view',
    token,
    prospect_id: artifact.prospect_id,
    ip:         req.ip,
  });

  // Return only what the frontend needs — never expose internal scores/emails
  res.json({
    company:      profile.company      || artifact.company || null,
    sector:       profile.sector       || artifact.sector  || null,
    signal_notes: artifact.signal_notes || null,
    findings:     artifact.findings    || [],
  });
});

module.exports = router;
