-- ============================================================
-- MADE2MEANT — Stripe: Session-ID an der Bestellung speichern
-- Im Supabase SQL Editor ausführen (einmalig).
-- ============================================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
