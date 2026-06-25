# 3D7 Tech — Project Memory

## What this is

Static website for **3D7 Tech**, a Business Transformation & AI Automation consultancy targeting UK SMEs in North West England. Deployed on **GitHub Pages** at `https://richardawe.github.io/3d7tech-v2`.

Owner: Richard Awe (richard@3d7tech.com). Process Improvement contact: abi@3d7tech.com.

---

## Design system

| Token | Value |
|-------|-------|
| Navy | `#0d1e3a` |
| Amber | `#b8721b` |
| Cream | `#f4f0e8` |
| Headings | Playfair Display (serif) |
| Body | Inter (sans-serif) |
| Borders | Hard 2px solid |

No gradients, no glassmorphism. Strong editorial grid.

---

## File map

```
index.html          Main landing page (hero → problems → services → sectors → packages → news → lead magnet → footer)
audit.html          Free process audit tool (scoring questionnaire)
book.html           4-step booking wizard (date → time → details → confirmation)
privacy.html        UK GDPR privacy policy + unsubscribe anchor (#unsubscribe)
llms.txt            Concise machine-readable summary for AI crawlers (llmstxt.org standard)
llms-full.txt       Extended version with full service/FAQ detail for LLMs
sitemap.xml         4 URLs: index, audit, book, privacy
robots.txt          Blocks /data/, /api/, /scripts/ — explicitly allows /data/news.json
SKILL.pdf           "10 Processes Every SME Should Automate in 2026" PDF lead magnet

assets/
  favicon.svg       SVG favicon (navy square, amber "3D7")
  logo.svg          Full SVG wordmark
  favicon.ico       PNG-in-ICO (6-byte ICONDIR + 16-byte ICONDIRENTRY + PNG bytes)
  favicon-16x16.png
  favicon-32x32.png
  apple-touch-icon.png  (180×180)
  og-image.png      (1200×630 social card)
  guide-source.html Source for PDF generation

js/
  consent.js        Cookie consent logic (localStorage)
  token.js          Personalisation token handling (URL ?t= param → localStorage)
  events.js         Analytics event queue (localStorage → optional VPS POST)
                    Line ~70: detects book.html links (not cal.com)

data/
  news.json         { updated: ISO, items: [{title,link,source,pubDate,ts}] } — auto-updated by GH Actions
  scoring.json      Lead scoring weights (source, sector, template performance)
  leads.json        Lead records (populated by VPS API)
  profiles.json     Enriched lead profiles
  bookings.json     Booking records
  events.json       Analytics events
  artifacts.json    Generated artefact tracking
  outcomes.json     Deal outcomes for scoring loop
  suppression.json  Unsubscribe / suppression list
  proof.json        Social proof / case study data

scripts/
  fetch-news.js     Fetches Google News RSS (2 queries), deduplicates, saves top 12 to data/news.json
  generate-assets.js Playwright script to regenerate favicons + OG image (needs Chromium at /opt/pw-browsers/)
  generate-pdf.js   Generates SKILL.pdf from assets/guide-source.html

api/
  server.js         Express VPS API (port 3001, nginx proxies /api/*)
  routes/submit.js  POST /api/submit — form submissions
  routes/booking.js POST /api/booking — booking requests
  routes/token.js   GET  /api/token  — personalisation token resolution
  routes/events.js  POST /api/events — analytics event ingestion

.github/workflows/
  deploy.yml        Deploys to GitHub Pages on push to main
  fetch-news.yml    Runs every 6 hours (cron: 0 */6 * * *) + manual trigger;
                    commits updated news.json to main with [skip ci]
```

---

## Graceful degradation pattern

All client-side JS works on GitHub Pages using **localStorage** only. The VPS API activates automatically when these window globals are set (e.g. injected by nginx or a `<script>` on the VPS):

```js
window.FORM_API_URL    = 'https://your-vps/api/submit'
window.BOOKING_API_URL = 'https://your-vps/api/booking'
window.TOKEN_API_URL   = 'https://your-vps/api/token'
window.EVENTS_API_URL  = 'https://your-vps/api/events'
```

Without these, forms save to localStorage, booking wizard is self-contained, analytics queue locally.

---

## Key behaviours

- **All "Enquire" / "Book" buttons** link to `book.html` directly — never `#booking` anchors
- **Schema.org** — three blocks in index.html: ProfessionalService, ItemList/Service, FAQPage
- **AI discoverability** — `<link rel="alternate" type="text/plain" title="LLMs.txt" href="llms.txt">` in `<head>`
- **Cookie banner** — aria-modal, aria-labelledby; consent stored in localStorage
- **Focus ring** — amber `:focus-visible` outline on all interactive elements
- **Skip link** — `.skip-link` → `#main-content` on every page; `tabindex="-1"` on target
- **News section** — fetches `data/news.json` on load; graceful empty/error states; aria-live
- **Guide form** — no Formspree; self-hosted JS handler; `role="alert"` error box; saves email to localStorage then optional API POST

---

## Contacts wired in site

| Role | Email |
|------|-------|
| AI & Automation | richard@3d7tech.com |
| Process Improvement | abi@3d7tech.com |

`richard3d7@gmail.com` is retired — do not use anywhere.

---

## GitHub Actions

### Deploy to GitHub Pages (`deploy.yml`)
- Triggers on push to `main`
- Uploads entire repo root as Pages artifact

### Fetch North West Business News (`fetch-news.yml`)
- Cron: `0 */6 * * *` (every 6 hours)
- `workflow_dispatch` for manual trigger
- Runs `node scripts/fetch-news.js` → commits `data/news.json` → pushes to main with `[skip ci]`
- Requires `permissions: contents: write`
- **First run must be triggered manually** via: `https://github.com/richardawe/3d7tech-v2/actions/workflows/fetch-news.yml`

---

## Environment notes

- **Google News RSS** (`news.google.com`) is blocked in Claude Code remote sessions — fetch-news.js returns 0 items locally but works in GitHub Actions
- **Playwright assets** regeneration: `node scripts/generate-assets.js` — requires Chromium at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` (only available in Claude Code remote env)
- **Base URL** hardcoded as `https://richardawe.github.io/3d7tech-v2` throughout — update everywhere when custom domain is set: `canonical`, `og:url`, `og:image`, `sitemap.xml`, `robots.txt Sitemap:`, `llms.txt`, `llms-full.txt`, Schema.org `@id`/`url`/`logo`
- **Branch**: all work commits directly to `main`; feature branch `claude/landing-page-github-pages-0yme4z` is stale

---

## Pending / future work

- [ ] **Trigger first news fetch** manually (URL above) to populate data/news.json with real articles
- [ ] **Custom domain** — update base URL throughout once VPS/domain ready
- [ ] **VPS migration** — deploy api/server.js, set nginx proxy for /api/*, inject window globals
- [ ] **Companies House signal scraper** — polling new incorporations in target sectors/postcodes
- [ ] **Outreach queue** — automated personalised email sequences from lead profiles
- [ ] **Scoring loop** — feed outcomes.json back into scoring.json template weights
- [ ] **Postgres migration** — move data/ JSON files to database (scripts/migrate-to-postgres.js, supabase/schema.sql not yet created)
- [ ] **proof.json** — populate with real case studies / testimonials for social proof section

---

## Running locally

```bash
# API server (VPS mode)
node api/server.js              # http://localhost:3001

# Regenerate brand assets (Claude Code remote env only)
node scripts/generate-assets.js

# Fetch news (blocked locally, use GH Actions)
node scripts/fetch-news.js

# Regenerate PDF guide
node scripts/generate-pdf.js
```
