// ============================================================
// WARENKORB — gespeichert im Browser (localStorage)
// Kein Server nötig, funktioniert sofort
// ============================================================

// Warenkorb aus dem Browser laden
// (kaputte/fremde Daten im Speicher dürfen die Seite nicht lahmlegen)
function getCart() {
  try {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    return Array.isArray(cart) ? cart : [];
  } catch (e) {
    return [];
  }
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
  if (badge) {
    const count = getCartCount();
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline' : 'none';
  }
  updateShippingBar();
}

// ── KOSTENLOSER VERSAND: Fortschritt in der Ankündigungsleiste ──
// (Grenze auch in cart.html/checkout.html/create-checkout-session — beim
// Ändern überall anpassen)
const FREE_SHIPPING_THRESHOLD = 119;

function updateShippingBar() {
  const bar = document.getElementById('shipping-bar');
  if (!bar) return; // Seite hat keine Ankündigungsleiste
  const label = bar.querySelector('.shipbar__label');
  const fill = bar.querySelector('.shipbar__fill');
  const total = getCartTotal();
  const pct = Math.max(0, Math.min(100, (total / FREE_SHIPPING_THRESHOLD) * 100));
  if (fill) fill.style.width = pct + '%';

  if (total <= 0) {
    bar.classList.remove('shipbar--active', 'shipbar--done');
    if (label) label.textContent = 'Kostenloser Versand ab 119 €';
  } else if (total >= FREE_SHIPPING_THRESHOLD) {
    bar.classList.add('shipbar--active', 'shipbar--done');
    if (label) label.textContent = 'Du hast kostenlosen Versand! 🎉';
  } else {
    bar.classList.add('shipbar--active');
    bar.classList.remove('shipbar--done');
    const remaining = FREE_SHIPPING_THRESHOLD - total;
    if (label) label.textContent = 'Noch € ' + remaining.toFixed(2).replace('.', ',') + ' bis zum kostenlosen Versand';
  }
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
