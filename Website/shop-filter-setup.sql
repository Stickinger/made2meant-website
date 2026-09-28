-- ============================================================
-- made2meant — Shop-Filter: Produktart & Farben
-- Im Supabase SQL-Editor ausführen (einmalig), BEVOR du im Admin
-- Produkte mit Produktart/Farben speicherst.
--
-- product_type: eine Produktart (Schlüssel aus js/catalog.js,
--               z. B. 'decke', 'kapuzentuch', 'set')
-- colors:       die Farben, in denen es das Produkt gibt
--               (Namen aus js/catalog.js, z. B. {Weiß, Salbei})
-- ============================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS colors TEXT[] DEFAULT '{}';

-- Mehrfach-Zuordnung: ein Produkt kann mehreren Kategorien und
-- mehreren Produktarten angehören (product_type/category_id bleiben
-- als "Primär"-Feld für Abwärtskompatibilität erhalten).
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_ids  UUID[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_types TEXT[] DEFAULT '{}';
