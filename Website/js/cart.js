// ============================================================
// WARENKORB — gespeichert im Browser (localStorage)
// Kein Server nötig, funktioniert sofort
// ============================================================

// Warenkorb aus dem Browser laden
function getCart() {
  return JSON.parse(localStorage.getItem('cart') || '[]');
}

// Warenkorb speichern
function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartBadge();
}

// Eindeutiger Schlüssel pro Produkt+Variante (z.B. gleiche Decke,
// andere Schriftfarbe = eigene Warenkorb-Position)
function cartKey(productId, options) {
  const opts = options && Object.keys(options).length
    ? '|' + Object.keys(options).sort().map(k => k + ':' + options[k]).join(';')
    : '';
  return productId + opts;
}

// Produkt hinzufügen (options z.B. {Schriftfarbe:'Grün', Polsterfarbe:'Braun'})
function addToCart(product, options = {}) {
  const cart = getCart();
  const key = cartKey(product.id, options);
  const existing = cart.find(item => (item.key || item.id) === key);

  if (existing) {
    existing.quantity += 1;
  } else {
    const { options: _productOptions, ...rest } = product;
    cart.push({ ...rest, key, options, quantity: 1 });
  }

  saveCart(cart);
  showToast('Zum Warenkorb hinzugefügt!');
}

// Position entfernen (key = cartKey; alte Einträge ohne key matchen über id)
function removeFromCart(key) {
  const cart = getCart().filter(item => (item.key || item.id) !== key);
  saveCart(cart);
}

// Menge ändern
function updateQuantity(key, quantity) {
  const cart = getCart();
  const item = cart.find(item => (item.key || item.id) === key);
  if (item) {
    item.quantity = quantity;
    if (item.quantity <= 0) return removeFromCart(key);
  }
  saveCart(cart);
}

// Gesamtpreis berechnen
function getCartTotal() {
  return getCart().reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

// Anzahl Artikel im Warenkorb
function getCartCount() {
  return getCart().reduce((sum, item) => sum + item.quantity, 0);
}

// Warenkorb leeren
function clearCart() {
  localStorage.removeItem('cart');
  localStorage.removeItem('discount_code');
  updateCartBadge();
}

// ── RABATTCODE (nur der Code wird gemerkt; der Betrag wird immer
//    frisch & serverseitig anhand der aktuellen Summe berechnet) ──
function getDiscountCode() { return localStorage.getItem('discount_code') || ''; }
function setDiscountCode(code) {
  if (code) localStorage.setItem('discount_code', String(code).toUpperCase());
  else localStorage.removeItem('discount_code');
}
function clearDiscount() { localStorage.removeItem('discount_code'); }

// Gespeicherten Code gegen die aktuelle Summe prüfen (per DB-Funktion).
// Gibt { code, amount } zurück oder { amount:0, error } wenn ungültig.
async function resolveDiscount(subtotal) {
  const code = getDiscountCode();
  if (!code) return { amount: 0 };
  try {
    const { data, error } = await db.rpc('validate_discount', { p_code: code, p_subtotal: subtotal });
    if (error || !data || !data.valid) {
      clearDiscount();
      return { amount: 0, error: (data && data.message) || 'Rabattcode ist nicht mehr gültig.' };
    }
    return { code: data.code, amount: Number(data.amount) };
  } catch (e) {
    return { amount: 0 };
  }
}

// Rotes Zähler-Badge auf dem Warenkorb-Icon updaten
function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;
  const count = getCartCount();
  badge.textContent = count;
  badge.style.display = count > 0 ? 'inline' : 'none';
}

// Kleine grüne Meldung unten rechts
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');   // Screenreader lesen die Meldung vor
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}
