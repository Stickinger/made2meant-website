// made2meant — eigene, cookielose Besucherstatistik
// Speichert nur: Seite (ohne persönliche Daten), Herkunfts-Website (nur Domain) und Zeitpunkt.
// Kein Cookie, keine IP, keine Geräte-ID → keine Einwilligung nötig.
// Aktionen (Warenkorb, Kasse) werden als „event:…“-Zeilen in derselben Tabelle gespeichert.
(function () {
  function hasDb() { return typeof db !== 'undefined' && db && db.from; }

  // /index.html → /, /shop.html → /shop; bei Produkten den slug behalten, dazu utm-Parameter
  function normPage() {
    let p = location.pathname.replace(/\/index(\.html)?$/, '/').replace(/\.html$/, '') || '/';
    const q = new URLSearchParams(location.search), keep = [];
    const slug = q.get('slug');
    if (slug && /^\/(product|personalize)/.test(p)) keep.push('slug=' + encodeURIComponent(slug.slice(0, 80)));
    ['utm_source', 'utm_medium', 'utm_campaign'].forEach(k => {
      const v = q.get(k); if (v) keep.push(k + '=' + encodeURIComponent(v.slice(0, 60)));
    });
    return p + (keep.length ? '?' + keep.join('&') : '');
  }

  // Nur externe Herkunft, gekürzt auf die Domain (z. B. „www.google.com“)
  function externalRef() {
    try {
      if (!document.referrer) return null;
      const u = new URL(document.referrer);
      return u.origin === location.origin ? null : u.hostname;
    } catch (_) { return null; }
  }

  function insert(row) {
    try { if (hasDb()) db.from('page_views').insert(row).then(() => {}, () => {}); } catch (_) {}
  }

  // Aktion zählen, z. B. m2mTrack('cart', 'bio-musselintuch')
  window.m2mTrack = function (event, detail) {
    insert({ page: 'event:' + event + (detail ? ':' + String(detail).slice(0, 80) : ''), referrer: normPage() });
  };

  insert({ page: normPage(), referrer: externalRef() });

  // Klicks auf Links und Buttons zählen (nur die Beschriftung, nie eingegebene Texte)
  function clickLabel(el) {
    if (el.dataset.track) return el.dataset.track;
    const href = el.getAttribute('href') || '';
    const m = href.match(/product(?:\.html)?\?(?:.*&)?slug=([^&#]+)/);
    if (m) return 'Produkt: ' + decodeURIComponent(m[1]);
    let t = (el.getAttribute('aria-label') || el.textContent || el.title || '').replace(/\s+/g, ' ').trim();
    if (!t && href) t = href;
    return t.slice(0, 60);
  }
  document.addEventListener('click', function (e) {
    const el = e.target.closest && e.target.closest('a, button, [data-track]');
    if (!el || el.closest('[data-notrack]')) return;
    const label = clickLabel(el);
    if (label) window.m2mTrack('click', label);
  }, true);
})();
