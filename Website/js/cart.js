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

// Produkt hinzufügen
function addToCart(product) {
  const cart = getCart();
  const existing = cart.find(item => item.id === product.id);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  saveCart(cart);
  showToast('Zum Warenkorb hinzugefügt!');
}

// Produkt entfernen
function removeFromCart(productId) {
  const cart = getCart().filter(item => item.id !== productId);
  saveCart(cart);
}

// Menge ändern
function updateQuantity(productId, quantity) {
  const cart = getCart();
  const item = cart.find(item => item.id === productId);
  if (item) {
    item.quantity = quantity;
    if (item.quantity <= 0) return removeFromCart(productId);
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
