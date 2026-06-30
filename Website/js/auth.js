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

// Seite schützen — nicht eingeloggte User wegschicken
async function requireAuth() {
  const user = await getUser();
  if (!user) window.location.href = '/login.html';
  return user;
}
