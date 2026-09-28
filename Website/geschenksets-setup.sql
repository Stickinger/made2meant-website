-- ============================================================
-- made2meant — Geschenk-Sets & Bestseller
-- Im Supabase SQL-Editor ausführen (einmalig). Darf auch laufen, wenn
-- shop-filter-setup.sql / bundles-kategorie-setup.sql schon ausgeführt
-- wurden — alles hier ist "IF NOT EXISTS" bzw. überspringt Vorhandenes.
-- ============================================================

-- Bestseller: im Admin per Häkchen/Stern festlegen
ALTER TABLE products ADD COLUMN IF NOT EXISTS bestseller   BOOLEAN DEFAULT false;

-- Inhalt eines Geschenk-Sets: [{ "product_id": "...", "name": "Decke", "qty": 1 }, …]
ALTER TABLE products ADD COLUMN IF NOT EXISTS bundle_items JSONB   DEFAULT '[]';

-- Felder, die der Set-Editor mitbenutzt (aus shop-filter-setup.sql)
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type  TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_types TEXT[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS colors        TEXT[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_ids  UUID[] DEFAULT '{}';

-- Kategorie für Sets (der Admin legt sie sonst beim ersten Set selbst an)
INSERT INTO categories (name, slug, description, featured, active, sort_order)
VALUES ('Geschenk-Sets', 'bundles', 'Wird automatisch vom Bereich „Geschenk-Sets“ im Admin verwendet.', false, true, 6)
ON CONFLICT (slug) DO NOTHING;
