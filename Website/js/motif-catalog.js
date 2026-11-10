// ── Stick-Motive aus unserem Musterkatalog ──────────────────────────
// Bilder: /assets/motive-frei/klein/<code>.webp (aus den Stickdateien gerendert; groß: /assets/motive-frei/).
// Preise laut Preisliste: weiteres kleines Motiv +5,90 €, weiteres großes Motiv +9,90 €.
// WICHTIG: Preise & Größen identisch halten mit
// supabase/functions/create-checkout-session/index.ts (MOTIF_CATALOG_SIZES).
const MOTIF_PRICES = { klein: 5.90, gross: 9.90 };

const MOTIF_GROUPS = [
  { key: 'M', name: 'Märchen & Ritter' },
  { key: 'C', name: 'Fahrzeuge' },
  { key: 'T', name: 'Wald & Tiere' },
  { key: 'D', name: 'Dinos' },
  { key: 'B', name: 'Blumen' },
  { key: 'G', name: 'Weitere' },
];

// [Code, Name, Größe]  – Größe 'gross' = großes Motiv, sonst klein
const MOTIF_CATALOG = [
  ['M1', 'Ritter zu Pferd', 'gross'], ['M2', 'Prinzessin blau', 'gross'], ['M3', 'Ritter mit Schwert', 'gross'],
  ['M4', 'Babydrache', 'klein'], ['M5', 'Drache mit Ei', 'gross'], ['M6', 'Burg', 'klein'],
  ['M7', 'Feuerdrache', 'gross'], ['M8', 'Prinzessin rosa', 'gross'], ['M9', 'Fliegender Drache', 'gross'],
  ['M10', 'Wappenschild', 'klein'], ['M11', 'Krone', 'klein'], ['M12', 'Gekreuzte Schwerter', 'klein'],

  ['C1', 'Flugzeug', 'klein'], ['C2', 'Bagger', 'klein'], ['C3', 'Schiff', 'klein'], ['C4', 'Traktor', 'klein'],
  ['C5', 'Werkstattauto', 'klein'], ['C6', 'U-Boot', 'klein'], ['C7', 'Lokomotive', 'klein'], ['C8', 'Segelboot', 'klein'],
  ['C9', 'Hubschrauber', 'klein'], ['C10', 'Rakete', 'klein'], ['C11', 'Piratenschiff', 'klein'], ['C12', 'Monstertruck', 'klein'],
  ['C13', 'Polizeiauto', 'klein'], ['C14', 'Rettungsauto', 'klein'], ['C15', 'Feuerwehrauto', 'klein'], ['C16', 'Heißluftballon', 'klein'],

  ['T1', 'Herbstzweig', 'gross'], ['T2', 'Rehkitz', 'klein'], ['T3', 'Blätterzweig', 'gross'], ['T4', 'Beerenzweig', 'gross'],
  ['T5', 'Hase', 'klein'], ['T6', 'Wolfswelpe', 'klein'], ['T7', 'Heulender Wolf', 'gross'], ['T8', 'Beerenzweiglein', 'klein'],
  ['T9', 'Fuchs', 'gross'], ['T11', 'Gans', 'klein'], ['T12', 'Vogel', 'klein'], ['T13', 'Hase sitzend', 'klein'],
  ['T14', 'Frosch', 'klein'], ['T15', 'Ente im Flug', 'klein'], ['T16', 'Bär', 'gross'], ['T17', 'Schnecke', 'klein'],

  ['D1', 'Ankylosaurus', 'klein'], ['D2', 'Spinosaurus', 'gross'], ['D3', 'Stegosaurus', 'klein'],
  ['D4', 'Brachiosaurus', 'gross'], ['D5', 'Triceratops', 'klein'], ['D6', 'Parasaurolophus', 'gross'],
  ['D7', 'T-Rex', 'gross'], ['D8', 'Flugsaurier', 'klein'], ['D9', 'Dino-Ei', 'klein'],

  ['B1', 'Nelke', 'klein'], ['B2', 'Wildblumen', 'klein'], ['B3', 'Blütenstrauß', 'klein'], ['B4', 'Rose', 'klein'],

  ['G1', 'Pferdekopf', 'gross'], ['G2', 'Bär auf Mond', 'gross'],
].map(([code, name, size]) => ({
  code, name, size, group: code.replace(/\d+$/, ''),
  label: `${code} ${name}`,                       // so landet es in Bestellung & Mail
  url: `/assets/motive-frei/klein/${code.toLowerCase()}.webp`,
  price: MOTIF_PRICES[size],
}));
