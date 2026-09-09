-- Motive pro Produkt (Schritt 2 der Personalisierung)
-- In Supabase → SQL Editor einfügen und ausführen.
-- Speichert je Produkt eine Liste: [{ "label": "Herz", "url": "...", "price": 2.90 }, ...]

ALTER TABLE products ADD COLUMN IF NOT EXISTS motifs JSONB DEFAULT '[]'::jsonb;
