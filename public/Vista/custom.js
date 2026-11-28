/**
 * Custom enhancements for 3DVista Tour.
 *
 * Merapikan baris tombol ikon di popup (PDF / Instagram / YouTube, panah prev-next):
 * ukuran ikon dan posisi vertikalnya berbeda-beda per popup karena 3DVista menaruhnya
 * secara absolut. Skrip ini hanya mengisi CSS variable --kijb-s (skala) dan --kijb-y
 * (geser vertikal) yang dipakai custom.css lewat `transform`. Layout, ukuran, dan event
 * bawaan 3DVista tidak diubah, jadi aman terhadap re-layout engine.
 */
(function () {
  'use strict';

  var ICON = 'img[src*="/skin/"]';
  var MIN_SIZE = 30;      // abaikan gambar dekoratif yang lebih kecil
  var MAX_SIZE = 80;      // abaikan gambar besar (banner, thumbnail)
  var ROW_BAND = 26;      // toleransi sumbu-y (px) agar ikon dianggap satu baris
  var ROW_SPREAD = 420;   // lebar maksimum satu baris ikon (px)
  var TARGET_MIN = 48;    // area sentuh minimum yang nyaman
  var SCALE_MIN = 0.7;
  var SCALE_MAX = 1.3;
  var SHIFT_MAX = 24;

  var scheduled = false;

  function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
  }

  function isVisible(el) {
    var r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    var cs = window.getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0';
  }

  // Ukur posisi asli: matikan transisi + transform sesaat, kalau tidak getBoundingClientRect
  // membaca posisi tengah-animasi dan hasilnya salah.
  function prepare(el) {
    el.style.transition = 'none';
    el.style.transform = 'none';
    el.style.removeProperty('--kijb-s');
    el.style.removeProperty('--kijb-y');
  }

  function release(el) {
    el.style.removeProperty('transform');
  }

  function tidy() {
    scheduled = false;
    var imgs = [].slice.call(document.querySelectorAll(ICON));
    imgs.forEach(prepare);

    var items = imgs
      .filter(function (el) {
        if (!isVisible(el)) return false;
        var r = el.getBoundingClientRect();
        var size = Math.max(r.width, r.height);
        return size >= MIN_SIZE && size <= MAX_SIZE;
      })
      .map(function (el) {
        var r = el.getBoundingClientRect();
        return {
          el: el,
          size: Math.max(r.width, r.height),
          cx: r.left + r.width / 2,
          cy: r.top + r.height / 2
        };
      })
      .sort(function (a, b) { return a.cy - b.cy; });

    // Kelompokkan ikon yang sebaris (cy berdekatan).
    var rows = [];
    items.forEach(function (it) {
      var row = rows[rows.length - 1];
      if (row && Math.abs(it.cy - row.avg) <= ROW_BAND) {
        row.items.push(it);
        row.avg = row.items.reduce(function (s, x) { return s + x.cy; }, 0) / row.items.length;
      } else {
        rows.push({ items: [it], avg: it.cy });
      }
    });

    rows.forEach(function (row) {
      if (row.items.length < 2) return; // ikon tunggal (close, sound) dibiarkan
      var xs = row.items.map(function (x) { return x.cx; });
      if (Math.max.apply(null, xs) - Math.min.apply(null, xs) > ROW_SPREAD) return;

      var sizes = row.items.map(function (x) { return x.size; }).sort(function (a, b) { return a - b; });
      var median = sizes[Math.floor(sizes.length / 2)];
      var target = Math.max(TARGET_MIN, Math.round(median));

      row.items.forEach(function (x) {
        var s = clamp(target / x.size, SCALE_MIN, SCALE_MAX);
        var dy = clamp(row.avg - x.cy, -SHIFT_MAX, SHIFT_MAX);
        x.el.style.setProperty('--kijb-s', s.toFixed(3));
        x.el.style.setProperty('--kijb-y', dy.toFixed(1) + 'px');
      });
    });

    // Terapkan hasil tanpa animasi, lalu kembalikan transisi hover seperti semula.
    imgs.forEach(release);
    void document.body.offsetWidth;
    imgs.forEach(function (el) { el.style.removeProperty('transition'); });
  }

  // Throttle: maksimal satu pengukuran per 100 ms, dijalankan setelah layout engine tenang.
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    window.setTimeout(tidy, 100);
  }

  function isOwnChange(m) {
    return m.type === 'attributes' && m.target.matches && m.target.matches(ICON);
  }

  function start() {
    if (!document.body) return;
    // Engine membuat node popup lalu mengatur posisinya lewat style inline, jadi pantau keduanya.
    // Perubahan style pada ikon (hasil skrip ini sendiri) diabaikan agar tidak berulang.
    new MutationObserver(function (list) {
      if (list.some(function (m) { return !isOwnChange(m); })) schedule();
    }).observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style']
    });
    window.addEventListener('resize', schedule);
    window.addEventListener('orientationchange', schedule);
    document.addEventListener('click', schedule, true); // prev/next mengganti isi popup
    document.addEventListener('touchend', schedule, true);
    schedule();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();

/**
 * Showcase Inovasi: opens /team inside the tour as a full-screen overlay.
 *
 * Called by the podium POIs. Their click action (patched into script_general.js by
 * scripts/patch-team-poi.py) is:  window.kijbOpenTeam('<category-id>')
 * The page itself runs in an iframe (?embed=1) and asks us to close via postMessage,
 * so the tour underneath keeps its exact camera position and state.
 * Details: docs/team-showcase.md
 */
(function () {
  'use strict';

  var OVERLAY_ID = 'kijb-team-overlay';
  var lastFocus = null;

  function close() {
    var el = document.getElementById(OVERLAY_ID);
    if (!el) return;
    el.parentNode.removeChild(el);
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('message', onMessage);
    if (lastFocus && lastFocus.focus) {
      try { lastFocus.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    }
    lastFocus = null;
  }

  function onKey(e) {
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
  }

  function onMessage(e) {
    if (e.origin !== window.location.origin) return;
    if (e.data && e.data.type === 'kijb-team-close') close();
  }

  window.kijbOpenTeam = function (category) {
    if (document.getElementById(OVERLAY_ID)) return;
    lastFocus = document.activeElement;

    var overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.className = 'kijb-team-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Showcase Inovasi KIJB 2025');

    var frame = document.createElement('iframe');
    frame.className = 'kijb-team-frame';
    frame.title = 'Showcase Inovasi KIJB 2025';
    frame.src = 'team/?embed=1' + (category ? '&c=' + encodeURIComponent(category) : '');

    // Click on the dim area (outside the panel) closes it, like a normal modal.
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });

    overlay.appendChild(frame);
    document.body.appendChild(overlay);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('message', onMessage);
    frame.addEventListener('load', function () { try { frame.contentWindow.focus(); } catch (e) { /* ignore */ } });
  };

  window.kijbCloseTeam = close;
})();
