// Cookie consent — must run before events.js so tracking only fires after acceptance.
(function () {
  var KEY = '3d7_consent';
  var banner = document.getElementById('cookie');
  if (!banner) return;

  var stored = localStorage.getItem(KEY);
  if (stored !== null) return; // already decided

  banner.style.display = 'flex';

  document.getElementById('c-accept').addEventListener('click', function () {
    localStorage.setItem(KEY, '1');
    banner.style.display = 'none';
    window.dispatchEvent(new Event('3d7:consent-accepted'));
  });

  document.getElementById('c-decline').addEventListener('click', function () {
    localStorage.setItem(KEY, '0');
    banner.style.display = 'none';
  });
})();

// Exported helper — events.js checks this before firing anything
window._3d7ConsentGiven = function () {
  return localStorage.getItem('3d7_consent') === '1';
};
