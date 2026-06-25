'use strict';
// Generates favicon PNGs, favicon.ico, apple-touch-icon, and OG social card.
// Run: node scripts/generate-assets.js

const { chromium } = require('playwright');
const fs   = require('fs');
const path = require('path');

const ASSETS = path.join(__dirname, '..', 'assets');
const EXEC   = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

async function screenshot(browser, html, w, h) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(html, { waitUntil: 'networkidle' });
  const buf = await page.screenshot({ type: 'png' });
  await page.close();
  return buf;
}

function makeMark(size) {
  const fs = Math.round(size * 0.425);
  const y  = Math.round(size * 0.725);
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:${size}px;height:${size}px;overflow:hidden}
    body{background:#0d1e3a;display:flex;align-items:center;justify-content:center}
    .t{font-family:Georgia,'Times New Roman',serif;font-weight:bold;
       font-size:${fs}px;color:#b8721b;line-height:1;letter-spacing:-0.5px}
  </style></head><body><div class="t">3D7</div></body></html>`;
}

const OG_HTML = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,900;1,700&family=Inter:wght@400;500&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:1200px;height:630px;overflow:hidden}
  body{background:#0d1e3a;display:flex;flex-direction:column;justify-content:center;padding:80px 96px;font-family:'Inter',system-ui,sans-serif}
  .logo{font-family:'Playfair Display',Georgia,serif;font-size:28px;font-weight:900;color:#fff;margin-bottom:44px}
  .logo span{color:#b8721b}
  .rule{width:72px;height:4px;background:#b8721b;margin-bottom:28px}
  h1{font-family:'Playfair Display',Georgia,serif;font-size:70px;font-weight:900;color:#fff;line-height:1.07;letter-spacing:-2px;margin-bottom:24px}
  h1 em{font-style:italic;color:#b8721b}
  p{font-size:22px;color:rgba(255,255,255,0.6);line-height:1.55;max-width:680px}
</style></head><body>
  <div class="logo">3D7 <span>Tech</span></div>
  <div class="rule"></div>
  <h1>Business Transformation<br>&amp; <em>AI Automation</em></h1>
  <p>Helping SMEs save time, reduce costs and scale.<br>North West England.</p>
</body></html>`;

function createIco(png32) {
  const hdr = Buffer.alloc(6);
  hdr.writeUInt16LE(0, 0);
  hdr.writeUInt16LE(1, 2);
  hdr.writeUInt16LE(1, 4);
  const ent = Buffer.alloc(16);
  ent.writeUInt8(32, 0);
  ent.writeUInt8(32, 1);
  ent.writeUInt8(0,  2);
  ent.writeUInt8(0,  3);
  ent.writeUInt16LE(1,  4);
  ent.writeUInt16LE(32, 6);
  ent.writeUInt32LE(png32.length, 8);
  ent.writeUInt32LE(22, 12);
  return Buffer.concat([hdr, ent, png32]);
}

(async () => {
  const browser = await chromium.launch({ executablePath: EXEC, headless: true });

  const p32  = await screenshot(browser, makeMark(32),  32,   32);
  const p16  = await screenshot(browser, makeMark(16),  16,   16);
  const p180 = await screenshot(browser, makeMark(180), 180,  180);
  const pOg  = await screenshot(browser, OG_HTML,       1200, 630);

  fs.writeFileSync(path.join(ASSETS, 'favicon-32x32.png'),    p32);
  fs.writeFileSync(path.join(ASSETS, 'favicon-16x16.png'),    p16);
  fs.writeFileSync(path.join(ASSETS, 'apple-touch-icon.png'), p180);
  fs.writeFileSync(path.join(ASSETS, 'favicon.ico'),          createIco(p32));
  fs.writeFileSync(path.join(ASSETS, 'og-image.png'),         pOg);

  await browser.close();

  console.log('favicon-16x16.png  ✓');
  console.log('favicon-32x32.png  ✓');
  console.log('apple-touch-icon.png ✓');
  console.log('favicon.ico        ✓');
  console.log('og-image.png       ✓');
})();
