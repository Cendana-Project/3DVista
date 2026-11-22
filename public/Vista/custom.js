// Tandai baris pendek di teks popup sebagai judul bagian (untuk custom.css).
(function () {
  var SEL = 'div[style*="text-align:left; color:#000"] > div';
  function mark() {
    document.querySelectorAll(SEL).forEach(function (d) {
      var t = d.textContent.trim();
      d.classList.toggle('tdv-h', t.length > 0 && t.length < 45 && !/[.,;:]$/.test(t));
    });
  }
  // shortcut: observe seluruh body, cukup untuk 66 popup; ganti ke observer per-popup bila terasa berat
  new MutationObserver(mark).observe(document.documentElement, { childList: true, subtree: true });
  mark();
})();
