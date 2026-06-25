// POST /api/submit  — lead magnet form handler
// Writes to data/leads.json and optionally sends a notification email.
'use strict';

const router = require('express').Router();
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const LEADS_FILE = path.join(__dirname, '..', '..', 'data', 'leads.json');
const SUPP_FILE  = path.join(__dirname, '..', '..', 'data', 'suppression.json');

function readJson(file, fallback = []) {
  try   { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

router.post('/', (req, res) => {
  const { name, email, company, sector, ref_token } = req.body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email required.' });
  }

  // Suppression check
  const suppressed = readJson(SUPP_FILE);
  if (suppressed.some(s => s.email.toLowerCase() === email.toLowerCase())) {
    // Acknowledge silently — don't reveal suppression to requester
    return res.json({ ok: true });
  }

  const leads = readJson(LEADS_FILE);

  // Dedup — update existing record if email matches
  const existing = leads.find(l => l.email && l.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    existing.last_seen = new Date().toISOString();
    existing.downloads = (existing.downloads || 0) + 1;
    writeJson(LEADS_FILE, leads);
    return res.json({ ok: true, download_url: '/assets/10-processes-sme-2026.pdf' });
  }

  const lead = {
    id:           crypto.randomUUID(),
    source:       'guide_download',
    name:         (name || '').trim(),
    email:        email.toLowerCase().trim(),
    company:      (company || '').trim(),
    sector:       (sector || '').trim(),
    ref_token:    ref_token || null,
    stage:        'captured',
    downloads:    1,
    created_at:   new Date().toISOString(),
    last_seen:    new Date().toISOString(),
  };

  leads.push(lead);
  writeJson(LEADS_FILE, leads);

  // Optional email notification (fires-and-forgets; no hard dependency)
  notifyAdmin(lead).catch(() => {});

  res.json({ ok: true, download_url: '/assets/10-processes-sme-2026.pdf' });
});

async function notifyAdmin(lead) {
  const email = process.env.NOTIFY_EMAIL;
  if (!email) return;

  // Uses the Resend API if RESEND_API_KEY is set
  const key = process.env.RESEND_API_KEY;
  if (!key) return;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    process.env.FROM_EMAIL || 'notify@mail.3d7tech.co.uk',
      to:      [email],
      subject: `New guide download — ${lead.company || lead.email}`,
      html:    `<p><strong>Name:</strong> ${lead.name}</p>
                <p><strong>Email:</strong> ${lead.email}</p>
                <p><strong>Company:</strong> ${lead.company}</p>
                <p><strong>Sector:</strong> ${lead.sector}</p>`,
    }),
  });
}

module.exports = router;
