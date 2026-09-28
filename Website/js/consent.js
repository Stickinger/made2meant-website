// ============================================================
// made2meant — Cookie-Einwilligung (§ 165 Abs. 3 TKG 2021, DSGVO)
//
// ▸ Hier die IDs eintragen, sobald die Konten bestehen. Leere IDs =
//   Dienst wird nie geladen. Solange ALLE leer sind, erscheint auch kein
//   Banner (es gibt dann nichts zuzustimmen) — der Link
//   „Cookie-Einstellungen“ funktioniert trotzdem.
//
// ▸ Vor der Einwilligung wird KEIN Tracking-Skript geladen (auch kein
//   Google-Tag). Google erhält beim Laden den Consent Mode v2 mit dem
//   gewählten Status (ad_storage, ad_user_data, ad_personalization,
//   analytics_storage).
//
// ▸ Die Auswahl wird 12 Monate gespeichert (localStorage), danach wird
//   neu gefragt. Jede Seite braucht einen Link mit data-cookie-settings —
//   fehlt er, fügt dieses Skript unten einen kleinen Fußzeilen-Link ein.
// ============================================================
(function () {
  const TRACKING = {
    ga4:          '',   // Google Analytics 4, z. B. 'G-XXXXXXXXXX'    → Statistik
    googleAds:    '',   // Google Ads,         z. B. 'AW-XXXXXXXXXX'   → Marketing
    gtm:          '',   // Google Tag Manager, z. B. 'GTM-XXXXXXX'     → lädt bei jeder Einwilligung
    metaPixel:    '',   // Meta Pixel,         z. B. '123456789012345' → Marketing
    tiktokPixel:  '',   // TikTok Pixel,       z. B. 'CXXXXXXXXXXXXXXXXXXX' → Marketing
  };

  const STORE_KEY = 'm2m_consent';
  const VERSION = 1;
  const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
  const anyTracker = Object.values(TRACKING).some(Boolean);

  // ── Gespeicherte Auswahl ──
  function readChoice() {
    try {
      const c = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (!c || c.v !== VERSION || Date.now() - c.ts > MAX_AGE_MS) return null;
      return c;
    } catch (e) { return null; }
  }
  function saveChoice(statistik, marketing) {
    const c = { v: VERSION, ts: Date.now(), statistik: !!statistik, marketing: !!marketing };
    try { localStorage.setItem(STORE_KEY, JSON.stringify(c)); } catch (e) {}
    return c;
  }

  // ── Google Consent Mode v2: Standard = alles abgelehnt ──
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;
  gtag('consent', 'default', {
    ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
    analytics_storage: 'denied', functionality_storage: 'granted', security_storage: 'granted',
  });

  function consentModeUpdate(c) {
    gtag('consent', 'update', {
      analytics_storage: c.statistik ? 'granted' : 'denied',
      ad_storage: c.marketing ? 'granted' : 'denied',
      ad_user_data: c.marketing ? 'granted' : 'denied',
      ad_personalization: c.marketing ? 'granted' : 'denied',
    });
  }

  // ── Dienste laden (jeweils nur einmal) ──
  const loaded = {};
  function addScript(src) {
    const s = document.createElement('script'); s.async = true; s.src = src;
    document.head.appendChild(s);
  }
  function loadGoogle(c) {
    const wantGa = c.statistik && TRACKING.ga4;
    const wantAds = c.marketing && TRACKING.googleAds;
    if (TRACKING.gtm && (c.statistik || c.marketing) && !loaded.gtm) {
      loaded.gtm = true;
      window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
      addScript('https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(TRACKING.gtm));
    }
    if ((wantGa || wantAds) && !loaded.gtag) {
      loaded.gtag = true;
      addScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(TRACKING.ga4 || TRACKING.googleAds));
      gtag('js', new Date());
    }
    if (wantGa && !loaded.ga4) { loaded.ga4 = true; gtag('config', TRACKING.ga4); }
    if (wantAds && !loaded.ads) { loaded.ads = true; gtag('config', TRACKING.googleAds); }
  }
  function loadMeta() {
    if (loaded.meta || !TRACKING.metaPixel) return; loaded.meta = true;
    /* eslint-disable */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq('init', TRACKING.metaPixel);
    window.fbq('track', 'PageView');
  }
  function loadTikTok() {
    if (loaded.tiktok || !TRACKING.tiktokPixel) return; loaded.tiktok = true;
    /* eslint-disable */
    !function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=d.createElement("script");o.type="text/javascript",o.async=!0,o.src=r+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)}}(window,document,'ttq');
    /* eslint-enable */
    window.ttq.load(TRACKING.tiktokPixel);
    window.ttq.page();
  }

  function apply(c) {
    consentModeUpdate(c);
    loadGoogle(c);
    if (c.marketing) { loadMeta(); loadTikTok(); }
  }

  // ── Banner ──
  const css = `
  .ck-box { position: fixed; z-index: 10000; left: 16px; right: 16px; bottom: 16px; max-width: 520px; margin: 0 auto;
    background: #FAF9F6; color: #2E1C16; border: 1px solid #DCD6CB; border-radius: 24px; box-shadow: 0 24px 60px rgba(43,18,14,.22);
    padding: 22px 22px 18px; font-family: var(--font-main, 'Nunito', system-ui, sans-serif); font-size: .88rem; line-height: 1.55; }
  .ck-box h2 { font-family: inherit; font-size: 1rem; font-weight: 700; letter-spacing: .02em; text-transform: uppercase; margin: 0 0 6px; color: #2B120E; }
  .ck-box p { margin: 0 0 14px; color: #5f544d; }
  .ck-box a { color: #2B120E; }
  .ck-opts { display: none; border-top: 1px solid #E8E4DC; margin: 4px 0 14px; padding-top: 10px; }
  .ck-box.ck-detail .ck-opts { display: block; }
  .ck-opt { display: flex; gap: 12px; align-items: flex-start; padding: 8px 0; }
  .ck-opt input { width: 18px; height: 18px; margin-top: 2px; accent-color: #2B120E; flex: 0 0 auto; }
  .ck-opt strong { display: block; color: #2B120E; font-size: .86rem; }
  .ck-opt span { color: #7A6D64; font-size: .8rem; }
  .ck-btns { display: flex; flex-wrap: wrap; gap: 8px; }
  .ck-btn { flex: 1 1 140px; border-radius: 999px; padding: 11px 16px; font: inherit; font-size: .78rem; font-weight: 700;
    letter-spacing: .06em; text-transform: uppercase; cursor: pointer; border: 1px solid #2B120E; }
  .ck-btn--solid { background: #2B120E; color: #F2F1EC; }
  .ck-btn--line { background: transparent; color: #2B120E; }
  .ck-link { background: none; border: 0; padding: 8px 0 0; font: inherit; font-size: .8rem; color: #7A6D64; text-decoration: underline; cursor: pointer; }
  .ck-foot { text-align: center; font-size: .78rem; padding: 18px 16px 24px; color: #7A6D64; }
  .ck-foot a { color: inherit; }`;

  let box = null, styled = false;
  function ensureStyle() {
    if (styled) return; styled = true;
    const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
  }
  function buildBox() {
    ensureStyle();
    box = document.createElement('div');
    box.className = 'ck-box'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'false');
    box.setAttribute('aria-label', 'Cookie-Einstellungen');
    const note = anyTracker ? '' : '<p><em>Derzeit setzen wir nur technisch notwendige Cookies ein.</em></p>';
    box.innerHTML = `
      <h2>Cookies &amp; Datenschutz</h2>
      <p>Wir verwenden technisch notwendige Cookies, damit Warenkorb, Konto und Bezahlung funktionieren.
      Mit deiner Einwilligung nutzen wir außerdem Dienste für Statistik und Werbung (Google, Meta, TikTok) –
      dabei können Daten auch in die USA übermittelt werden. Du kannst deine Auswahl jederzeit über
      „Cookie-Einstellungen“ in der Fußzeile ändern. Mehr in der <a href="/datenschutz.html#cookies">Datenschutzerklärung</a>.</p>
      ${note}
      <div class="ck-opts">
        <label class="ck-opt"><input type="checkbox" checked disabled><div><strong>Notwendig</strong><span>Warenkorb, Anmeldung, Zahlung, Speichern dieser Auswahl. Immer aktiv.</span></div></label>
        <label class="ck-opt"><input type="checkbox" id="ck-stat"><div><strong>Statistik</strong><span>Google Analytics 4 – anonyme Auswertung, wie unsere Seite genutzt wird.</span></div></label>
        <label class="ck-opt"><input type="checkbox" id="ck-mkt"><div><strong>Marketing</strong><span>Google Ads, Meta Pixel (Facebook/Instagram), TikTok Pixel – Erfolgsmessung und passende Werbung.</span></div></label>
      </div>
      <div class="ck-btns">
        <button type="button" class="ck-btn ck-btn--line" data-ck="none">Nur notwendige</button>
        <button type="button" class="ck-btn ck-btn--solid" data-ck="all">Alle akzeptieren</button>
        <button type="button" class="ck-btn ck-btn--line ck-save" data-ck="save" style="display:none">Auswahl speichern</button>
      </div>
      <button type="button" class="ck-link" data-ck="detail">Einstellungen anpassen</button>`;
    document.body.appendChild(box);
    box.addEventListener('click', (e) => {
      const act = e.target.closest('[data-ck]')?.dataset.ck;
      if (!act) return;
      if (act === 'detail') {
        box.classList.add('ck-detail');
        box.querySelector('.ck-save').style.display = '';
        e.target.style.display = 'none';
        return;
      }
      const c = act === 'all' ? saveChoice(true, true)
              : act === 'none' ? saveChoice(false, false)
              : saveChoice(box.querySelector('#ck-stat').checked, box.querySelector('#ck-mkt').checked);
      hide();
      // Widerruf: bereits geladene Skripte lassen sich nicht „entladen" → neu laden
      if (window.__m2mConsentApplied && (!c.statistik || !c.marketing)) { location.reload(); return; }
      apply(c); window.__m2mConsentApplied = c.statistik || c.marketing;
    });
  }
  function show(detail) {
    if (!box) buildBox();
    const c = readChoice();
    box.querySelector('#ck-stat').checked = !!(c && c.statistik);
    box.querySelector('#ck-mkt').checked = !!(c && c.marketing);
    box.classList.toggle('ck-detail', !!detail);
    box.querySelector('.ck-save').style.display = detail ? '' : 'none';
    box.querySelector('[data-ck="detail"]').style.display = detail ? 'none' : '';
    box.style.display = '';
  }
  function hide() { if (box) box.style.display = 'none'; }

  function wireSettingsLinks() {
    let links = document.querySelectorAll('[data-cookie-settings]');
    if (!links.length) {
      // Seite ohne Fußzeile (z. B. Kasse): kleinen Link ergänzen
      const foot = document.createElement('div');
      foot.className = 'ck-foot';
      foot.innerHTML = '<a href="/impressum.html">Impressum</a> · <a href="/datenschutz.html">Datenschutz</a> · <a href="/agb.html">AGB</a> · <a href="#cookie-einstellungen" data-cookie-settings>Cookie-Einstellungen</a>';
      document.body.appendChild(foot);
      ensureStyle();
      links = foot.querySelectorAll('[data-cookie-settings]');
    }
    links.forEach(a => a.addEventListener('click', (e) => { e.preventDefault(); show(true); }));
  }

  function init() {
    wireSettingsLinks();
    const c = readChoice();
    if (c) { apply(c); window.__m2mConsentApplied = c.statistik || c.marketing; }
    else if (anyTracker) show(false);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // Für andere Skripte (z. B. später Kauf-Events): aktuelle Einwilligung
  window.m2mConsent = () => readChoice() || { statistik: false, marketing: false };
})();
