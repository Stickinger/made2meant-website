-- ============================================================
-- MADE2MEANT — Stickstellen pro Produkt (flexibler Konfigurator)
-- Im Supabase SQL Editor ausführen (einmalig).
--
-- Speichert je Produkt die Stickstellen (Name + Aufpreis), z.B.
-- [{"label":"Brust","price":6.90},{"label":"Rücken","price":6.90}]
-- ============================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS positions JSONB DEFAULT '[]';
