// Personalisation token resolver.
// Reads ?ref= from the URL, fetches the prospect's context from the engine API,
// and injects personalised copy into the page.
//
// On GitHub Pages (no backend): token resolution is a no-op; the page renders generic.
// On VPS: set window.TOKEN_API_URL to your endpoint before this script loads,
//   e.g. <script>window.TOKEN_API_URL = 'https://api.3d7tech.co.uk/token';</script>
(function () {
  var API = window.TOKEN_API_URL || null;
  var params = new URLSearchParams(window.location.search);
  var token = params.get('ref');

  if (!token) return;

  // Write token into any hidden form fields so it's captured on submission
  document.querySelectorAll('#form-token, #guide-form-token').forEach(function (el) {
    el.value = token;
  });

  if (!API) {
    // No backend wired up yet — log for debugging, render generic
    console.info('[3D7 token] TOKEN_API_URL not set; skipping personalisation.');
    return;
  }

  fetch(API + '?token=' + encodeURIComponent(token), { credentials: 'omit' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (prospect) {
      if (!prospect) return;
      personalise(prospect);
    })
    .catch(function (err) {
      console.warn('[3D7 token] Resolution failed:', err.message);
    });

  function personalise(p) {
    // ── index.html hero personalisation ──
    var heroH1  = document.getElementById('hero-h1');
    var heroSub = document.getElementById('hero-sub');
    var heroSlot = document.getElementById('hero-personalised');

    if (heroH1 && p.company) {
      heroSlot.innerHTML =
        '<p style="font-size:0.85rem;color:var(--amber);font-weight:600;margin-bottom:0.5rem">' +
        'This page was prepared for ' + esc(p.company) + '</p>';
      heroSlot.style.display = 'block';
    }

    if (heroSub && p.sector) {
      heroSub.textContent =
        'We help ' + esc(p.sector) + ' businesses like yours save time, reduce costs ' +
        'and scale — with practical process improvement and AI automation.';
    }

    // ── audit.html personalised state ──
    fill('p-company', p.company);
    fill('p-context',  p.signal_notes || 'Process snapshot prepared by 3D7 Tech');
    fill('p-headline',
      'We identified three areas where ' + esc(p.company || 'your business') +
      ' is likely losing time and money.');
    fill('p-intro',
      'Based on what we know about ' + esc(p.sector || 'your sector') +
      ', here’s where the biggest opportunities are — and what you can do about them.');

    if (p.findings && p.findings.length >= 3) {
      fill('p-f1-title', p.findings[0].title);
      fill('p-f1-body',  p.findings[0].body);
      fill('p-f2-title', p.findings[1].title);
      fill('p-f2-body',  p.findings[1].body);
      fill('p-f3-title', p.findings[2].title);
      fill('p-f3-body',  p.findings[2].body);
    }

    // Emit a token-resolved event for analytics
    window.dispatchEvent(new CustomEvent('3d7:token-resolved', { detail: { token: token, company: p.company } }));
  }

  function fill(id, text) {
    var el = document.getElementById(id);
    if (el && text) el.textContent = text;
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
