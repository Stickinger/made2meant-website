// ============================================================
// KATALOG — Produktarten, Farben & Preisbereiche
// Gemeinsame Liste für den Shop-Filter (shop.html) und den
// Produkt-Dialog im Admin. Neue Art/Farbe? Einfach hier ergänzen.
//
// match: Fallback für Produkte, bei denen im Admin noch keine
//        Produktart gewählt ist (Suche in Name/Beschreibung/Tags).
// ============================================================

const PRODUCT_TYPES = [
  { key: 'decke',         label: 'Decke',          match: /decke/ },
  { key: 'handtuch',      label: 'Handtuch',       match: /(?<!kapuzen)handtuch/ },
  { key: 'kapuzentuch',   label: 'Kapuzentuch',    match: /kapuze/ },
  { key: 'haube',         label: 'Haube',          match: /haube/ },
  { key: 'musselin',      label: 'Musselin',       match: /musselin|mull|nuschi|spucktuch|swaddle|puck/ },
  { key: 'laetzchen',     label: 'Lätzchen',       match: /lätzchen|laetzchen/ },
  { key: 'schnuffeltuch', label: 'Schnuffeltuch',  match: /schnuffel|schmusetuch|kuscheltuch/ },
  { key: 'spielzeug',     label: 'Spielzeug',      match: /spielzeug|kuscheltier|greifling|rassel|spieluhr/ },
  { key: 'polster',       label: 'Polster',        match: /polster|kissen/ },
  { key: 'bekleidung',    label: 'Bekleidung',     match: /shirt|hoodie|kappe|bademantel|poncho|schürze/ },
  { key: 'tasche',        label: 'Tasche',         match: /tasche|rucksack|turnbeutel/ },
  { key: 'set',           label: 'Geschenkset',    match: /geschenkset|\bset\b|bundle|paket/ },
];

// Alte Links (z. B. ?typ=hauben) weiter unterstützen
const PRODUCT_TYPE_ALIASES = { hauben: 'haube' };

const PRODUCT_COLORS = [
  { name: 'Weiß',       hex: '#F0EDE8' },
  { name: 'Creme',      hex: '#EFE7DA' },
  { name: 'Natur',      hex: '#E7DCCB' },
  { name: 'Beige',      hex: '#C4A882' },
  { name: 'Grau',       hex: '#A8A9AD' },
  { name: 'Anthrazit',  hex: '#3A3A3A' },
  { name: 'Schwarz',    hex: '#1A1A1A' },
  { name: 'Navy',       hex: '#1B2A4A' },
  { name: 'Blau',       hex: '#5B9EC9' },
  { name: 'Hellblau',   hex: '#A9CBE3' },
  { name: 'Rosa',       hex: '#D4789E' },
  { name: 'Altrosa',    hex: '#C98B93' },
  { name: 'Bordeaux',   hex: '#7B1C2E' },
  { name: 'Grün',       hex: '#42553D' },
  { name: 'Salbei',     hex: '#8DA190' },
  { name: 'Mint',       hex: '#A8CBB7' },
  { name: 'Gelb',       hex: '#E2C35A' },
  { name: 'Senf',       hex: '#C9A84C' },
  { name: 'Terracotta', hex: '#C56A47' },
  { name: 'Braun',      hex: '#8A5A3B' },
];

const PRICE_RANGES = [
  { key: 'bis25',   label: 'Bis 25 €',     min: 0,   max: 25 },
  { key: '25-50',   label: '25 – 50 €',    min: 25,  max: 50 },
  { key: '50-100',  label: '50 – 100 €',   min: 50,  max: 100 },
  { key: 'ab100',   label: 'Über 100 €',   min: 100, max: Infinity },
];

function colorHex(name) {
  const n = String(name || '').toLowerCase().trim();
  const c = PRODUCT_COLORS.find(c => c.name.toLowerCase() === n);
  if (c) return c.hex;
  const legacy = { 'weiss': '#F0EDE8', 'sand': '#E7DCCB', 'silber': '#A8A9AD', 'rot': '#7B1C2E', 'gruen': '#42553D', 'gold': '#C9A84C' };
  return legacy[n] || '#D8CBB8';
}
