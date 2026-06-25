// POST /api/booking  — discovery call booking handler
// GET  /api/booking/slots?date=YYYY-MM-DD  — returns taken slots for a date
'use strict';

const router = require('express').Router();
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const BOOKINGS_FILE = path.join(__dirname, '..', '..', 'data', 'bookings.json');
const CONFIG_FILE   = path.join(__dirname, '..', '..', 'data', 'booking-config.json');

function readJson(file, fallback) {
  try   { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}
function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

// GET /api/booking/slots?date=2026-07-01
router.get('/slots', (req, res) => {
  const { date } = req.query;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Valid date required (YYYY-MM-DD).' });
  }
  const bookings = readJson(BOOKINGS_FILE, []);
  const taken = bookings.filter(b => b.date === date && b.status !== 'cancelled').map(b => b.time);
  res.json({ date, taken });
});

// POST /api/booking
router.post('/', (req, res) => {
  const { date, time, first_name, last_name, email, company, company_size, sector, topic, ref_token } = req.body;

  if (!date || !time || !first_name || !email || !company || !topic) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email required.' });
  }

  const config   = readJson(CONFIG_FILE, {});
  const bookings = readJson(BOOKINGS_FILE, []);

  // Check slot is not already taken
  const conflict = bookings.some(b => b.date === date && b.time === time && b.status !== 'cancelled');
  if (conflict) {
    return res.status(409).json({ error: 'That slot has just been taken. Please choose another time.' });
  }

  // Check slot is in config list
  if (config.slots && !config.slots.includes(time)) {
    return res.status(400).json({ error: 'Invalid time slot.' });
  }

  const booking = {
    id:           crypto.randomUUID(),
    date,
    time,
    first_name:   first_name.trim(),
    last_name:    (last_name || '').trim(),
    email:        email.toLowerCase().trim(),
    company:      company.trim(),
    company_size: company_size || null,
    sector:       sector || null,
    topic:        topic.trim(),
    ref_token:    ref_token || null,
    status:       'confirmed',
    created_at:   new Date().toISOString(),
  };

  bookings.push(booking);
  writeJson(BOOKINGS_FILE, bookings);

  // Notification
  notifyAdmin(booking).catch(() => {});
  sendConfirmation(booking).catch(() => {});

  res.json({ ok: true, booking_id: booking.id });
});

// DELETE /api/booking/:id  — cancellation
router.delete('/:id', (req, res) => {
  const bookings = readJson(BOOKINGS_FILE, []);
  const idx = bookings.findIndex(b => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Booking not found.' });
  bookings[idx].status = 'cancelled';
  bookings[idx].cancelled_at = new Date().toISOString();
  writeJson(BOOKINGS_FILE, bookings);
  res.json({ ok: true });
});

async function notifyAdmin(b) {
  const email = process.env.NOTIFY_EMAIL;
  const key   = process.env.RESEND_API_KEY;
  if (!email || !key) return;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    process.env.FROM_EMAIL || 'notify@mail.3d7tech.co.uk',
      to:      [email],
      subject: `New booking — ${b.company} (${b.date} ${b.time})`,
      html:    `<p><strong>${b.first_name} ${b.last_name}</strong> from <strong>${b.company}</strong></p>
                <p><strong>Date:</strong> ${b.date} at ${b.time}</p>
                <p><strong>Email:</strong> ${b.email}</p>
                <p><strong>Sector:</strong> ${b.sector || 'not specified'}</p>
                <p><strong>Topic:</strong> ${b.topic}</p>`,
    }),
  });
}

async function sendConfirmation(b) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    process.env.FROM_EMAIL || 'hello@3d7tech.co.uk',
      to:      [b.email],
      subject: `Your discovery call is confirmed — ${b.date} at ${b.time}`,
      html:    `<p>Hi ${b.first_name},</p>
                <p>Your free 30-minute discovery call with 3D7 Tech is confirmed.</p>
                <p><strong>Date:</strong> ${b.date}<br>
                   <strong>Time:</strong> ${b.time} (UK time)<br>
                   <strong>Format:</strong> We'll send a video link or call you — we'll confirm shortly.</p>
                <p>Questions before the call? Reply to this email.</p>
                <p>— 3D7 Tech</p>`,
    }),
  });
}

module.exports = router;
