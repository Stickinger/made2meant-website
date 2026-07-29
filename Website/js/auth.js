// ============================================================
// AUTH — Login, Register, Logout, Session
// ============================================================

// Aktuellen eingeloggten User holen
async function getUser() {
  const { data: { user } } = await db.auth.getUser();
  return user;
}

// Registrieren
async function register(email, password, fullName) {
  const { data, error } = await db.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName }
    }
  });
  if (error) throw new Error(error.message || error.error_description || JSON.stringify(error) || 'Registrierung fehlgeschlagen.');

  // Profile-Eintrag anlegen (kein DB-Trigger nötig)
  if (data?.user) {
    await db.from('profiles').upsert({ id: data.user.id }).select();
  }

  return data;
}

// Einloggen
async function login(email, password) {
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// Ausloggen
async function logout() {
  const { error } = await db.auth.signOut();
  if (error) throw error;
  window.location.href = '/index.html';
}

// Nav-Bar anpassen je nachdem ob eingeloggt oder nicht
async function updateNav() {
  const user = await getUser();
  const loginLink = document.getElementById('nav-login');
  const accountLink = document.getElementById('nav-account');
  const logoutBtn = document.getElementById('nav-logout');

  if (user) {
    if (loginLink) loginLink.style.display = 'none';
    if (accountLink) accountLink.style.display = 'inline';
    if (logoutBtn) logoutBtn.style.display = 'inline';
  } else {
    if (loginLink) loginLink.style.display = 'inline';
    if (accountLink) accountLink.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'none';
  }
}

// Seite schützen — nicht eingeloggte User wegschicken.
// Nutzt getSession() (liest die lokale Sitzung, braucht keinen Server) —
// so wird man bei kurzem Serverausfall nicht fälschlich rausgeworfen.
async function requireAuth() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) { window.location.href = '/login.html'; return null; }
  return session.user;
}

// Netzwerk-/Serverfehler in eine verständliche Meldung übersetzen
function authErrorMessage(err) {
  const msg = (err && (err.message || err.error_description || err.msg)) || '';
  if (/failed to fetch|networkerror|load failed|fetch/i.test(msg)) {
    return 'Server nicht erreichbar. Bitte versuch es in ein paar Minuten erneut.';
  }
  if (/invalid login credentials/i.test(msg)) return 'E-Mail oder Passwort ist falsch.';
  if (/already registered|already exists/i.test(msg)) return 'Diese E-Mail ist bereits registriert.';
  return msg || 'Etwas ist schiefgelaufen. Bitte versuch es erneut.';
}

// Passwort-Anzeigen-Umschalter (Auge) an alle Passwortfelder hängen
function setupPasswordToggles() {
  const EYE = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
  const EYE_OFF = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.4M6.6 6.6C3.6 8.3 2 11 2 11s3.5 7 10 7a9 9 0 0 0 5.4-1.6"/><path d="m2 2 20 20"/></svg>';

  document.querySelectorAll('input[type="password"]').forEach(input => {
    if (input.dataset.pwToggle) return;
    input.dataset.pwToggle = '1';

    const wrap = document.createElement('span');
    wrap.className = 'pw-wrap';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pw-toggle';
    btn.setAttribute('aria-label', 'Passwort anzeigen');
    btn.setAttribute('aria-pressed', 'false');
    btn.innerHTML = EYE;
    btn.addEventListener('click', () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.setAttribute('aria-pressed', String(show));
      btn.setAttribute('aria-label', show ? 'Passwort verbergen' : 'Passwort anzeigen');
      btn.innerHTML = show ? EYE_OFF : EYE;
    });
    wrap.appendChild(btn);
  });
}
document.addEventListener('DOMContentLoaded', setupPasswordToggles);
