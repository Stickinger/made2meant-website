-- ============================================================
-- made2meant — Newsletter-Willkommens-Mail
-- Im Supabase SQL-Editor ausführen (einmalig).
-- ============================================================

-- Merken, wer schon eine Willkommens-Mail bekommen hat
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS welcomed BOOLEAN DEFAULT false;

-- 10%-Willkommensgutschein anlegen (unbegrenzt gültig, kein Mindestbestellwert)
INSERT INTO discount_codes (code, type, value, min_order, active)
VALUES ('WILLKOMMEN10', 'percentage', 10, 0, true)
ON CONFLICT (code) DO UPDATE
  SET type = 'percentage', value = 10, active = true;
