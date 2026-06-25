#!/usr/bin/env node
// Generates assets/10-processes-sme-2026.pdf from assets/guide-source.html
// Uses Playwright + the pre-installed Chromium at PLAYWRIGHT_BROWSERS_PATH.
// Run: node scripts/generate-pdf.js

const { chromium } = require('playwright');
const path = require('path');

const SRC  = path.join(__dirname, '..', 'assets', 'guide-source.html');
const DEST = path.join(__dirname, '..', 'assets', '10-processes-sme-2026.pdf');

(async () => {
  console.log('Launching Chromium…');
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  });
  const page    = await browser.newPage();

  const url = 'file://' + SRC;
  console.log('Loading:', url);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

  // Wait for Google Fonts to load
  await page.waitForTimeout(2000);

  console.log('Generating PDF…');
  await page.pdf({
    path:   DEST,
    format: 'A4',
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
    printBackground: true,
  });

  await browser.close();
  console.log('Done →', DEST);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
