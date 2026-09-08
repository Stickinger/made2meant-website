-- ============================================================
-- made2meant — Bestell-Benachrichtigungen per E-Mail
-- Im Supabase SQL-Editor ausführen (einmalig).
-- ============================================================

-- ── Einstellungs-Tabelle (Schlüssel/Wert) ───────────────────
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Nur Admins dürfen Einstellungen sehen/ändern.
-- (Die Server-Funktion nutzt den Service-Key und umgeht RLS ohnehin.)
DROP POLICY IF EXISTS "Admin verwaltet Einstellungen" ON settings;
CREATE POLICY "Admin verwaltet Einstellungen"
  ON settings FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- Standard-Eintrag anlegen (leere Empfängerliste)
INSERT INTO settings (key, value)
VALUES ('order_notification_emails', '[]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ── Bestellungen: merken, ob schon benachrichtigt wurde ──────
-- (verhindert doppelte E-Mails, z. B. bei Webhook-Wiederholungen)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_notified BOOLEAN DEFAULT false;
