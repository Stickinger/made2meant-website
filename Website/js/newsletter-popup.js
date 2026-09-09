// ============================================================
// made2meant — Newsletter-Popup mit 10%-Willkommensgutschein
// Auf gewünschten Seiten einbinden:  <script src="/js/newsletter-popup.js"></script>
// Voraussetzung: /js/supabase.js (db) ist vorher geladen.
// Der Code WILLKOMMEN10 muss im Admin unter Rabattcodes angelegt sein.
// ============================================================
(function () {
  const WELCOME_CODE = 'WILLKOMMEN10';
  const WELCOME_PCT  = 10;
  const DONE_KEY     = 'nl_popup_done';   // gesetzt nach Schließen/Erfolg
  const DELAY_MS     = 1500;

  // Nicht im Kauf-/Konto-Bereich stören
  const BLOCKED = ['/checkout', '/cart', '/account', '/login', '/register', '/order-success', '/admin'];
  const path = location.pathname.toLowerCase();
  if (BLOCKED.some(p => path.includes(p))) return;

  // Schon erledigt? (dauerhaft nicht mehr zeigen)
  try { if (localStorage.getItem(DONE_KEY)) return; } catch (e) {}

  function markDone() { try { localStorage.setItem(DONE_KEY, '1'); } catch (e) {} }

  // ── Styles ────────────────────────────────────────────────
  const css = `
  .nlp-overlay { position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center; justify-content: center;
    padding: 20px; background: rgba(28,28,28,0.55); opacity: 0; transition: opacity .35s ease; }
  .nlp-overlay.nlp-show { opacity: 1; }
  .nlp-card { position: relative; width: 100%; max-width: 430px; background: var(--color-surface, #FBF9F6);
    border-radius: var(--radius-lg, 16px); box-shadow: 0 24px 70px rgba(28,28,28,.28); padding: 40px 34px 30px;
    text-align: center; transform: translateY(14px) scale(.98); transition: transform .35s ease; overflow: hidden; }
  .nlp-overlay.nlp-show .nlp-card { transform: none; }
  .nlp-card::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 6px;
    background: var(--color-primary, #C56A47); }
  .nlp-close { position: absolute; top: 12px; right: 14px; width: 32px; height: 32px; border: none; cursor: pointer;
    background: transparent; color: var(--color-muted, #8a8580); font-size: 22px; line-height: 1; border-radius: 50%; }
  .nlp-close:hover { background: rgba(0,0,0,.05); color: var(--color-text, #1c1c1c); }
  .nlp-eyebrow { font-size: .72rem; font-weight: 700; letter-spacing: .18em; text-transform: uppercase;
    color: var(--color-primary, #C56A47); margin-bottom: 10px; }
  .nlp-title { font-family: var(--font-head, 'Fraunces', Georgia, serif); font-size: 1.9rem; line-height: 1.1;
    color: var(--color-text, #1c1c1c); margin: 0 0 12px; }
  .nlp-title b { color: var(--color-primary, #C56A47); }
  .nlp-text { font-size: .95rem; line-height: 1.6; color: var(--color-muted, #6b665f); margin: 0 auto 22px; max-width: 320px; }
  .nlp-form { display: flex; flex-direction: column; gap: 10px; }
  .nlp-input { width: 100%; padding: 13px 14px; font-size: 1rem; border: 1.5px solid var(--color-border, #E6DFD5);
    border-radius: var(--radius, 8px); background: var(--color-bg, #fff); color: var(--color-text, #1c1c1c); box-sizing: border-box; }
  .nlp-input:focus { outline: none; border-color: var(--color-primary, #C56A47); }
  .nlp-btn { width: 100%; padding: 13px 16px; font-size: 1rem; font-weight: 700; cursor: pointer; border: none;
    border-radius: var(--radius, 8px); background: var(--color-primary, #C56A47); color: #fff; transition: filter .2s ease; }
  .nlp-btn:hover { filter: brightness(1.06); }
  .nlp-btn:disabled { opacity: .6; cursor: default; }
  .nlp-msg { font-size: .82rem; min-height: 1.1em; margin-top: 4px; }
  .nlp-decline { margin-top: 14px; background: none; border: none; cursor: pointer; font-size: .8rem;
    color: var(--color-muted, #8a8580); text-decoration: underline; }
  .nlp-decline:hover { color: var(--color-text, #1c1c1c); }
  .nlp-fine { font-size: .72rem; color: var(--color-muted, #8a8580); margin-top: 16px; }
  .nlp-codebox { display: flex; align-items: center; justify-content: space-between; gap: 10px;
    border: 1.5px dashed var(--color-primary, #C56A47); border-radius: var(--radius, 8px);
    padding: 12px 14px; margin: 6px 0 4px; background: rgba(197,106,71,.06); }
  .nlp-code { font-family: var(--font-head, serif); font-size: 1.35rem; font-weight: 700; letter-spacing: .08em;
    color: var(--color-primary, #C56A47); }
  .nlp-copy { border: none; cursor: pointer; background: var(--color-primary, #C56A47); color: #fff;
    padding: 8px 12px; border-radius: 6px; font-size: .8rem; font-weight: 700; white-space: nowrap; }
  @media (prefers-reduced-motion: reduce) {
    .nlp-overlay, .nlp-card { transition: none; } .nlp-card { transform: none; }
  }`;

  // ── DOM aufbauen ──────────────────────────────────────────
  function build() {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.className = 'nlp-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Newsletter-Anmeldung mit 10% Gutschein');
    overlay.innerHTML = `
      <div class="nlp-card">
        <button class="nlp-close" aria-label="Schließen">&times;</button>
        <div class="nlp-body">
          <div class="nlp-eyebrow">Willkommensgeschenk</div>
          <h2 class="nlp-title"><b>10%</b> auf deine<br>erste Bestellung</h2>
          <p class="nlp-text">Melde dich für unseren Newsletter an und erhalte deinen Gutscheincode – dazu Neuheiten und kleine Aufmerksamkeiten.</p>
          <form class="nlp-form" novalidate>
            <input class="nlp-input" type="email" placeholder="deine@email.com" aria-label="E-Mail-Adresse" required>
            <button class="nlp-btn" type="submit">Code sichern</button>
            <div class="nlp-msg" aria-live="polite"></div>
          </form>
          <button class="nlp-decline" type="button">Nein danke</button>
          <div class="nlp-fine">Abmeldung jederzeit möglich. Kein Spam.</div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    return overlay;
  }

  const overlay = build();
  const card    = overlay.querySelector('.nlp-card');
  const body    = overlay.querySelector('.nlp-body');
  const form    = overlay.querySelector('.nlp-form');
  const input   = overlay.querySelector('.nlp-input');
  const msg     = overlay.querySelector('.nlp-msg');

  function open() {
    requestAnimationFrame(() => overlay.classList.add('nlp-show'));
    setTimeout(() => { try { input.focus(); } catch (e) {} }, 380);
  }
  function close() {
    markDone();
    overlay.classList.remove('nlp-show');
    setTimeout(() => overlay.remove(), 350);
    document.removeEventListener('keydown', onKey);
  }
  function onKey(e) { if (e.key === 'Escape') close(); }

  overlay.querySelector('.nlp-close').addEventListener('click', close);
  overlay.querySelector('.nlp-decline').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', onKey);

  // ── Anmeldung ─────────────────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = input.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      msg.style.color = 'var(--color-primary, #C56A47)';
      msg.textContent = 'Bitte gib eine gültige E-Mail-Adresse ein.';
      return;
    }
    const btn = form.querySelector('.nlp-btn');
    btn.disabled = true; msg.style.color = 'var(--color-muted, #8a8580)'; msg.textContent = 'Einen Moment…';

    // Anmelden + Willkommens-Mail (Funktion trägt ein und verschickt den Code)
    try {
      const { error } = await db.functions.invoke('newsletter-welcome', { body: { email } });
      if (error) throw error;
    } catch (err) {
      btn.disabled = false;
      msg.style.color = 'var(--color-primary, #C56A47)';
      msg.textContent = 'Das hat nicht geklappt — bitte später erneut versuchen.';
      return;
    }

    // Code direkt in den Warenkorb legen (falls cart.js vorhanden)
    try { if (typeof setDiscountCode === 'function') setDiscountCode(WELCOME_CODE); } catch (e) {}

    showSuccess();
  });

  function showSuccess() {
    markDone(); // Erfolg: nicht mehr nerven
    body.innerHTML = `
      <div class="nlp-eyebrow">Willkommen bei made2meant 🤍</div>
      <h2 class="nlp-title">Dein Code ist da</h2>
      <p class="nlp-text">Wir haben ihn dir per E-Mail geschickt und schon in deinem Warenkorb hinterlegt. Gib ihn an der Kasse ein und spare ${WELCOME_PCT}%.</p>
      <div class="nlp-codebox">
        <span class="nlp-code">${WELCOME_CODE}</span>
        <button class="nlp-copy" type="button">Kopieren</button>
      </div>
      <button class="nlp-btn" type="button" style="margin-top:16px;">Weiter shoppen</button>
      <div class="nlp-fine">Der Code gilt für deine nächste Bestellung.</div>`;

    body.querySelector('.nlp-copy').addEventListener('click', (ev) => {
      try { navigator.clipboard.writeText(WELCOME_CODE); ev.target.textContent = 'Kopiert ✓'; } catch (e) {}
    });
    body.querySelector('.nlp-btn').addEventListener('click', close);
  }

  // ── Anzeigen ──────────────────────────────────────────────
  if (typeof db === 'undefined') return; // ohne Supabase kein Popup
  setTimeout(open, DELAY_MS);
})();
