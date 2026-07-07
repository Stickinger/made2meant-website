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
  updateCartBadge();
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
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}
