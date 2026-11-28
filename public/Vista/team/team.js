/* /team - Showcase Inovasi KIJB 2025
 *
 * Views (hash routing so it works on any static host, deep links and the browser
 * back button included):
 *   #/                 category list (podium order)
 *   #/<category>       inovasi in that category
 *   #/<category>/<id>  detail
 *
 * Query: ?c=<category>  open a category directly (used by the tour POIs)
 *        ?embed=1       running inside the tour overlay: shows a close button and
 *                       tells the parent page to close it via postMessage
 *
 * Data: data/inovasi.json. Empty fields (description, video, instagram, org, pdf) are
 * simply not rendered. All text goes through textContent, never innerHTML.
 */
(function () {
  'use strict';

  var params = new URLSearchParams(location.search);
  var EMBED = params.get('embed') === '1';
  var DATA_URL = 'data/inovasi.json?v=20261128b';

  var els = {
    back: document.getElementById('back'),
    close: document.getElementById('close'),
    eyebrow: document.getElementById('eyebrow'),
    heading: document.getElementById('heading'),
    content: document.getElementById('content')
  };

  var data = null;

  if (EMBED) document.body.classList.add('embed');

  /* ---------- tiny helpers ---------- */

  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') el.className = attrs[k];
      else if (k === 'text') el.textContent = attrs[k];
      else el.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) {
      if (c) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return el;
  }

  function svg(path, size) {
    var ns = 'http://www.w3.org/2000/svg';
    var s = document.createElementNS(ns, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('width', size || 20);
    s.setAttribute('height', size || 20);
    s.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS(ns, 'path');
    p.setAttribute('d', path);
    p.setAttribute('fill', 'currentColor');
    s.appendChild(p);
    return s;
  }

  var ICON = {
    pdf: 'M6 2h8l6 6v14H6V2zm7 1.5V9h5.5L13 3.5zM8 13h8v1.6H8V13zm0 3.2h8v1.6H8v-1.6z',
    play: 'M8 5v14l11-7L8 5z',
    insta: 'M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5zm0 2a3 3 0 00-3 3v10a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H7zm5 3.5A4.5 4.5 0 1112 16.5 4.5 4.5 0 0112 7.5zm0 2A2.5 2.5 0 1012 14.5 2.5 2.5 0 0012 9.5zM17.2 6a1.1 1.1 0 110 2.2 1.1 1.1 0 010-2.2z'
  };

  function safeUrl(u) {
    if (typeof u !== 'string' || !u.trim()) return null; // empty field: no button
    try {
      var url = new URL(u);
      return (url.protocol === 'https:' || url.protocol === 'http:') ? url.href : null;
    } catch (e) { return null; }
  }

  function youtubeId(u) {
    if (!u) return null;
    var m = String(u).match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
    return m ? m[1] : null;
  }

  function plural(n) { return n + ' inovasi'; }

  /* ---------- routing ---------- */

  function parseRoute() {
    var parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    return { cat: parts[0] || null, id: parts[1] || null };
  }

  function go(hash) { location.hash = hash; }

  function render() {
    if (!data) return;
    var r = parseRoute();
    var cat = r.cat && data.categories.filter(function (c) { return c.id === r.cat; })[0];
    var item = cat && r.id && data.items.filter(function (i) { return i.id === r.id && i.category === cat.id; })[0];

    if (item) renderDetail(cat, item);
    else if (cat) renderCategory(cat);
    else renderHome();

    els.back.hidden = !cat;
    els.close.hidden = !EMBED;
    document.title = (item ? item.short : cat ? cat.name : 'Showcase Inovasi') + ' - KIJB 2025';
    els.content.scrollTop = 0;
    window.scrollTo(0, 0);
    els.content.focus({ preventScroll: true });
  }

  /* ---------- views ---------- */

  function renderHome() {
    els.eyebrow.textContent = 'KIJB 2025';
    els.heading.textContent = 'Showcase Inovasi';

    var list = h('ul', { class: 'grid' });
    data.categories.slice().sort(function (a, b) { return a.order - b.order; }).forEach(function (c) {
      var count = data.items.filter(function (i) { return i.category === c.id; }).length;
      var card = h('button', { type: 'button', class: 'card' }, [
        h('span', { class: 'badge', text: String(c.order) }),
        h('span', { class: 'card-body' }, [h('span', { class: 'card-title', text: c.name })]),
        h('span', { class: 'card-meta', text: plural(count) })
      ]);
      card.addEventListener('click', function () { go('/' + c.id); });
      list.appendChild(h('li', {}, [card]));
    });

    els.content.replaceChildren(
      h('p', { class: 'lead', text: 'Pilih kategori untuk melihat inovasi peserta KIJB 2025.' }),
      list
    );
  }

  function renderCategory(cat) {
    els.eyebrow.textContent = 'Kategori';
    els.heading.textContent = cat.name;

    var items = data.items.filter(function (i) { return i.category === cat.id; })
      .sort(function (a, b) { return a.order - b.order; });

    var list = h('ul', { class: 'grid list' });
    items.forEach(function (i) {
      var card = h('button', { type: 'button', class: 'card' }, [
        h('span', { class: 'badge', text: String(i.order) }),
        h('span', { class: 'card-body' }, [
          h('span', { class: 'card-title', text: i.short || i.title }),
          i.short && i.short !== i.title ? h('span', { class: 'card-sub', text: i.title }) : null
        ])
      ]);
      card.addEventListener('click', function () { go('/' + cat.id + '/' + i.id); });
      list.appendChild(h('li', {}, [card]));
    });

    els.content.replaceChildren(
      h('p', { class: 'lead', text: plural(items.length) + '. Pilih salah satu untuk melihat detailnya.' }),
      list
    );
  }

  function renderDetail(cat, item) {
    els.eyebrow.textContent = cat.name;
    els.heading.textContent = item.short || item.title;

    var vid = youtubeId(item.video);
    var wrap = h('div', { class: 'detail' + (vid ? ' has-video' : '') });

    if (vid) {
      wrap.appendChild(h('div', { class: 'video' }, [
        h('iframe', {
          src: 'https://www.youtube-nocookie.com/embed/' + vid + '?rel=0',
          title: 'Video ' + (item.short || item.title),
          loading: 'lazy',
          allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen',
          allowfullscreen: ''
        })
      ]));
    }

    var panel = h('div', { class: 'panel' }, [
      h('p', {}, [h('span', { class: 'tag', text: cat.name })]),
      h('h2', { text: item.title })
    ]);
    if (item.org) panel.appendChild(h('p', { class: 'org', text: item.org }));
    if (item.description) panel.appendChild(h('p', { class: 'desc', text: item.description }));
    else if (!vid) panel.appendChild(h('p', { class: 'empty', text: 'Deskripsi lengkap akan segera tersedia.' }));

    var actions = h('div', { class: 'actions' });
    if (item.pdf && /^pdf\/[a-z0-9-]+\.pdf$/.test(item.pdf)) {
      actions.appendChild(h('a', { class: 'btn', href: item.pdf, target: '_blank', rel: 'noopener' }, [svg(ICON.pdf), 'Lihat dokumen (PDF)']));
    }
    var yt = safeUrl(item.video);
    if (yt) actions.appendChild(h('a', { class: 'btn secondary', href: yt, target: '_blank', rel: 'noopener noreferrer' }, [svg(ICON.play), 'Tonton di YouTube']));
    var ig = safeUrl(item.instagram);
    if (ig) actions.appendChild(h('a', { class: 'btn secondary', href: ig, target: '_blank', rel: 'noopener noreferrer' }, [svg(ICON.insta), 'Instagram']));
    if (actions.children.length) panel.appendChild(actions);

    wrap.appendChild(panel);
    els.content.replaceChildren(wrap);
  }

  /* ---------- chrome: back / close ---------- */

  els.back.addEventListener('click', function () {
    var r = parseRoute();
    go(r.id ? '/' + r.cat : '/');
  });

  function closeEmbed() {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'kijb-team-close' }, location.origin);
    }
  }
  els.close.addEventListener('click', closeEmbed);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && EMBED) closeEmbed();
  });

  window.addEventListener('hashchange', render);

  /* ---------- boot ---------- */

  function showError() {
    var retry = h('button', { type: 'button', class: 'btn', text: 'Coba lagi' });
    retry.addEventListener('click', load);
    els.content.replaceChildren(h('div', { class: 'status' }, [
      h('p', { text: 'Daftar inovasi gagal dimuat.' }), retry
    ]));
  }

  function load() {
    els.content.replaceChildren(h('p', { class: 'status', text: 'Memuat…' }));
    fetch(DATA_URL).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(function (json) {
      data = json;
      var start = params.get('c');
      if (start && !location.hash) {
        history.replaceState(null, '', location.pathname + location.search + '#/' + encodeURIComponent(start));
      }
      render();
    }).catch(showError);
  }

  load();
})();
