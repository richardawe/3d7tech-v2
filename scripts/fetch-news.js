'use strict';
// Fetches North West England business news from Google News RSS and saves to data/news.json.
// Run manually: node scripts/fetch-news.js
// Run automatically: .github/workflows/fetch-news.yml (every 6 hours)

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const QUERIES = [
  'business "north west" england',
  'SME "north west england"',
];

const BASE = 'https://news.google.com/rss/search?hl=en-GB&gl=GB&ceid=GB:en&num=20&q=';

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; 3D7NewsBot/1.0)' } }, res => {
      // Follow single redirect
      if (res.statusCode === 301 || res.statusCode === 302) {
        return get(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function decode(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .trim();
}

function parseItems(xml) {
  const items = [];
  const rx = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = rx.exec(xml)) !== null) {
    const block = m[1];
    const title  = decode((block.match(/<title[^>]*>([\s\S]*?)<\/title>/)     || [])[1] || '');
    const link   = decode((block.match(/<link[^>]*>\s*([\s\S]*?)\s*<\/link>/) || [])[1] || '');
    const pubDate = ((block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)            || [])[1] || '').trim();
    const source = decode((block.match(/<source[^>]*>([\s\S]*?)<\/source>/)   || [])[1] || '');

    if (!title || !link || link.includes('google.com/search')) continue;

    let ts;
    try { ts = new Date(pubDate).toISOString(); } catch { ts = new Date().toISOString(); }

    items.push({ title, link, source, pubDate, ts });
  }
  return items;
}

function dedup(items) {
  const seen = new Set();
  return items.filter(i => {
    if (seen.has(i.title)) return false;
    seen.add(i.title);
    return true;
  });
}

(async () => {
  const all = [];

  for (const q of QUERIES) {
    const url = BASE + encodeURIComponent(q);
    try {
      const xml   = await get(url);
      const items = parseItems(xml);
      all.push(...items);
      console.log(`  [${q}] → ${items.length} items`);
    } catch (err) {
      console.warn(`  [${q}] fetch error:`, err.message);
    }
  }

  // Deduplicate, sort newest first, take top 12
  const items = dedup(all)
    .sort((a, b) => new Date(b.ts) - new Date(a.ts))
    .slice(0, 12);

  const out = { updated: new Date().toISOString(), items };
  fs.writeFileSync(
    path.join(__dirname, '..', 'data', 'news.json'),
    JSON.stringify(out, null, 2) + '\n'
  );
  console.log(`Saved ${items.length} articles → data/news.json`);
})().catch(err => { console.error(err); process.exit(1); });
