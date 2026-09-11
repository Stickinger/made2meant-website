-- ============================================================
-- made2meant — Senddrop Versandlabels
-- Im Supabase SQL-Editor ausführen (einmalig).
-- Fügt der Bestell-Tabelle Felder für Sendung + Tracking hinzu.
-- ============================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS senddrop_shipment_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number      TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_link        TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_carrier     TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS label_created_at     TIMESTAMPTZ;
