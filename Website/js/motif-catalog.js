// ── Stick-Motive aus unserem Musterkatalog ──────────────────────────
// Bilder: Fotos unserer echten Stickmuster – /assets/motive-palette/einzeln/<code>.webp (Ausschnitt je Motiv)
// und /assets/motive-palette/<gruppe>.webp (ganze Palette, siehe MOTIF_PALETTES unten).
// Freigestellt für den Design-Editor: /assets/motive-frei/<code>.webp (aus den Stickdateien gerendert).
// Preise laut Preisliste: weiteres kleines Motiv +5,90 €, weiteres großes Motiv +9,90 €.
// WICHTIG: Preise & Größen identisch halten mit
// supabase/functions/create-checkout-session/index.ts (MOTIF_CATALOG_SIZES).
const MOTIF_PRICES = { klein: 5.90, gross: 9.90 };

const MOTIF_GROUPS = [
  { key: 'M', name: 'Mittelalter' },
  { key: 'C', name: 'Fahrzeuge' },
  { key: 'T', name: 'Tiere & Wald' },
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
  url: `/assets/motive-palette/einzeln/${code.toLowerCase()}.webp`,   // Foto vom echten Stickmuster
  price: MOTIF_PRICES[size],
}));

// Ganze Paletten (Fotos der Musterstoffe) mit Klickfläche je Motiv: [links, oben, Breite, Höhe] in % des Fotos.
// Neu erzeugen: 09_Made2Meant/output/motive-vorschau/palette (pal_prep.py, pal_boxes.py, pal_out.py).
const MOTIF_PALETTES = {"D":{"img":"/assets/motive-palette/d.webp","ratio":1.3333,"boxes":{"D1":[15.0,2.67,21.0,20.0],"D2":[42.5,2.67,21.5,24.67],"D3":[71.5,3.33,20.5,22.67],"D4":[12.0,33.33,19.0,26.67],"D5":[39.0,32.67,20.5,27.33],"D6":[73.5,34.0,21.5,28.67],"D7":[15.0,68.0,16.5,28.67],"D8":[44.5,69.33,16.5,28.67],"D9":[78.0,70.67,10.0,27.33]}},"B":{"img":"/assets/motive-palette/b.webp","ratio":2.5974,"boxes":{"B1":[3.0,1.3,16.5,92.21],"B2":[24.5,1.3,20.0,94.81],"B3":[49.5,1.3,19.0,93.51],"B4":[81.0,7.79,16.5,89.61]}},"G":{"img":"/assets/motive-palette/g.webp","ratio":1.6389,"boxes":{"G1":[0.85,1.39,47.46,97.22],"G2":[51.69,1.39,47.46,97.22]}},"M":{"img":"/assets/motive-palette/m.webp","ratio":0.75,"boxes":{"M1":[8.89,5.33,33.78,24.67],"M2":[42.67,5.33,24.0,22.67],"M3":[65.78,5.33,18.67,22.67],"M4":[9.78,31.33,20.44,21.33],"M5":[35.56,31.33,21.33,22.0],"M6":[62.22,31.33,21.33,20.67],"M7":[3.56,56.0,32.89,20.67],"M8":[40.89,56.0,24.44,22.67],"M9":[66.22,56.0,20.89,20.67],"M10":[14.22,80.67,14.22,16.0],"M11":[37.33,80.67,16.0,14.0],"M12":[69.33,80.67,13.33,14.67]}},"C":{"img":"/assets/motive-palette/c.webp","ratio":0.75,"boxes":{"C1":[7.56,13.33,22.22,19.67],"C2":[31.11,13.33,20.44,18.67],"C3":[53.33,13.33,19.11,19.33],"C4":[75.56,13.33,18.67,19.33],"C5":[4.44,35.0,21.33,18.67],"C6":[32.0,35.0,17.78,18.33],"C7":[53.33,35.0,20.44,18.33],"C8":[76.89,35.0,16.44,18.33],"C9":[5.78,56.0,27.11,18.67],"C10":[34.67,55.33,16.44,18.67],"C11":[59.11,54.67,15.56,18.0],"C12":[77.33,54.0,19.11,18.0],"C13":[7.11,75.33,18.67,19.33],"C14":[32.0,75.33,17.78,18.0],"C15":[57.78,74.67,20.44,16.0],"C16":[80.0,72.0,13.33,18.67]}},"T":{"img":"/assets/motive-palette/t.webp","ratio":0.75,"boxes":{"T1":[2.22,4.67,21.78,28.67],"T2":[25.78,4.67,18.67,23.33],"T3":[46.22,4.67,20.44,27.33],"T4":[67.56,4.67,20.44,28.67],"T5":[7.11,36.67,15.11,19.33],"T6":[30.22,36.67,16.0,18.67],"T7":[52.44,36.0,21.33,21.33],"T8":[74.67,36.0,10.67,17.33],"T9":[1.78,61.33,27.56,16.67],"T11":[32.89,60.67,14.22,18.0],"T12":[54.22,60.0,14.22,16.0],"T13":[72.89,59.33,14.22,16.67],"T14":[8.89,82.67,14.22,15.33],"T15":[28.44,81.33,18.67,18.67],"T16":[49.78,80.67,24.89,18.0],"T17":[75.56,80.0,14.22,15.33]}}};
