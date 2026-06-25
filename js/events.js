// Analytics event emitter.
// Fires events for view, scroll depth, form capture, and booking clicks.
// Events are queued in localStorage until a backend endpoint is configured.
//
// On VPS: set window.EVENTS_API_URL to your endpoint, e.g.:
//   <script>window.EVENTS_API_URL = 'https://api.3d7tech.co.uk/events';</script>
// The engine's orchestrator will drain events.json on each run.
(function () {
  var API     = window.EVENTS_API_URL || null;
  var SESSION = (Math.random()).toString(36).slice(2);
  var PAGE    = window.location.pathname;
  var QUEUE_KEY = '3d7_eq';

  function consent() {
    return typeof window._3d7ConsentGiven === 'function'
      ? window._3d7ConsentGiven()
      : false;
  }

  function emit(type, meta) {
    if (!consent()) return;

    var ev = {
      t:       type,
      page:    PAGE,
      session: SESSION,
      ts:      new Date().toISOString(),
      meta:    meta || {}
    };

    if (API) {
      navigator.sendBeacon
        ? navigator.sendBeacon(API, JSON.stringify(ev))
        : fetch(API, { method: 'POST', body: JSON.stringify(ev), keepalive: true }).catch(function(){});
    } else {
      // Buffer locally until the API is wired up
      try {
        var q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
        q.push(ev);
        if (q.length > 200) q = q.slice(-200); // cap at 200
        localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
      } catch (e) {}
    }
  }

  // ── Page view ──────────────────────────────────────────
  emit('page_view');

  // ── Scroll depth (50 % and 90 %) ──────────────────────
  var fired = {};
  window.addEventListener('scroll', function () {
    if (!consent()) return;
    var pct = Math.round((window.scrollY + window.innerHeight) / document.body.scrollHeight * 100);
    if (pct >= 50 && !fired[50])  { fired[50]  = true; emit('scroll_50'); }
    if (pct >= 90 && !fired[90])  { fired[90]  = true; emit('scroll_90'); }
  }, { passive: true });

  // ── Form submissions ───────────────────────────────────
  document.addEventListener('submit', function (e) {
    var form = e.target.closest('form');
    if (!form) return;
    emit('form_submit', { form_id: form.id || 'unknown' });
  });

  // ── Booking link clicks ────────────────────────────────
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (!a) return;
    var href = a.href || '';
    if (href.includes('book.html') || href.includes('#booking')) {
      emit('booking_click', { href: href });
    }
    if (href.includes('audit.html') || href.includes('process-snapshot')) {
      emit('snapshot_click');
    }
  });

  // ── Token resolved (personalised visit) ───────────────
  window.addEventListener('3d7:token-resolved', function (e) {
    emit('token_visit', { company: e.detail.company });
  });

  // ── Re-emit after consent granted mid-session ─────────
  window.addEventListener('3d7:consent-accepted', function () {
    emit('page_view'); // emit the view they consented to retrospectively
  });
})();
