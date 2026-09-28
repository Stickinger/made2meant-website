// ============================================================
// PRODUKTE — laden aus Supabase-Datenbank
// ============================================================

// Alle Produkte laden (mit 4 Sekunden Timeout).
// Kategorie wird mitgeladen (Slug + Name) — z. B. um Bundles zu erkennen
// (category_slug === 'bundles') oder für die Suche (category_name).
async function loadProducts() {
  try {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 4000)
    );
    const query = db
      .from('products')
      .select('*, categories(slug, name)')
      .eq('active', true)
      .order('created_at', { ascending: false });

    const { data, error } = await Promise.race([query, timeout]);
    if (error || !data || data.length === 0) return [];

    // Kategorien-Map für Mehrfach-Zuordnung (products.category_ids)
    let cats = [];
    try {
      const ct = new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 2500));
      const res = await Promise.race([db.from('categories').select('id, slug, name'), ct]);
      cats = res.data || [];
    } catch { cats = []; }
    const catMap = {};
    cats.forEach(c => { catMap[c.id] = c; });

    return data.map(p => {
      const ids = (Array.isArray(p.category_ids) && p.category_ids.length)
        ? p.category_ids
        : (p.category_id ? [p.category_id] : []);
      const slugs = ids.map(id => catMap[id]?.slug).filter(Boolean);
      const names = ids.map(id => catMap[id]?.name).filter(Boolean);
      const primarySlug = p.categories?.slug || slugs[0] || null;
      return {
        ...p,
        category_slugs: slugs.length ? slugs : (primarySlug ? [primarySlug] : []),
        category_names: names.length ? names : (p.categories?.name ? [p.categories.name] : []),
        // Kompatibel: 'bundles', falls IRGENDEINE Zuordnung bundles ist, sonst Primärkategorie
        category_slug: slugs.includes('bundles') ? 'bundles' : primarySlug,
        category_name: p.categories?.name || names[0] || null,
      };
    });
  } catch {
    return [];
  }
}

// Ein einzelnes Produkt per Slug laden (für Detailseite)
async function loadProduct(slug) {
  const { data, error } = await db
    .from('products')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    console.error('Produkt nicht gefunden:', error.message);
    return null;
  }
  return data;
}

// Produkt-Karte HTML bauen
function renderProductCard(product) {
  return `
    <div class="product-card">
      <a href="/product.html?slug=${product.slug}">
        <img
          src="${product.image_url || '/assets/images/placeholder.png'}"
          alt="${product.name}"
          class="product-card__image"
        >
      </a>
      <div class="product-card__body">
        <h3 class="product-card__name">
          <a href="/product.html?slug=${product.slug}">${product.name}</a>
        </h3>
        <p class="product-card__price">€${product.price.toFixed(2)}</p>
        ${product.stock > 0
          ? `<button class="btn btn--primary" onclick="addToCart(${JSON.stringify(product).replace(/"/g, '&quot;')})">
               In den Warenkorb
             </button>`
          : `<button class="btn btn--disabled" disabled>Ausverkauft</button>`
        }
      </div>
    </div>
  `;
}

// Platzhalter-Produkte falls Datenbank noch leer ist
const DEMO_PRODUCTS = [
  {
    id: 'demo-1',
    name: 'Einhornpolster',
    slug: 'einhornpolster',
    price: 6.99,
    stock: 100,
    image_url: 'https://placehold.co/400x400/1a1a1a/ff4444?text=🦄',
    description: 'Flauschiger Einhorn-Sticker mit Glitzereffekt.'
  },
  {
    id: 'demo-2',
    name: 'Galaxy Pack',
    slug: 'galaxy-pack',
    price: 4.99,
    stock: 150,
    image_url: 'https://placehold.co/400x400/1a1a1a/ff4444?text=🌌',
    description: 'Hochwertiger Vinyl-Sticker mit Galaxy-Motiv.'
  },
  {
    id: 'demo-3',
    name: 'Skateboard Tiger',
    slug: 'skateboard-tiger',
    price: 3.49,
    stock: 200,
    image_url: 'https://placehold.co/400x400/1a1a1a/ff4444?text=🐯',
    description: 'Cooler Tiger-Sticker im Streetart-Stil.'
  },
  {
    id: 'demo-4',
    name: 'Blumen Set 5er',
    slug: 'blumen-set-5er',
    price: 7.99,
    stock: 80,
    image_url: 'https://placehold.co/400x400/1a1a1a/ff4444?text=🌸',
    description: '5 verschiedene Blumen-Sticker in Pastellfarben.'
  }
];

// Produktgrid auf der Homepage befüllen
async function renderProductGrid(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '<p class="loading">Produkte werden geladen...</p>';
  let products = await loadProducts();

  // Wenn Datenbank leer → Platzhalter zeigen
  if (products.length === 0) {
    products = DEMO_PRODUCTS;
  }

  container.innerHTML = products.map(renderProductCard).join('');
}
