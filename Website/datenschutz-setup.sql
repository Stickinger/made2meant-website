-- ============================================================
-- made2meant — Datenschutz: Newsletter-Double-Opt-in &
-- Einwilligung für Versandbenachrichtigungen
-- Im Supabase SQL-Editor ausführen (einmalig), BEVOR die neue
-- Kasse und die neue Funktion newsletter-welcome live gehen.
-- ============================================================

-- ── Newsletter: Double-Opt-in mit Nachweis ────────────────────
-- confirmed      erst nach Klick auf den Bestätigungslink true
-- confirm_token  steckt im Bestätigungs- und im Abmeldelink
-- consent_*      Zeitpunkt/IP der Anmeldung (Nachweis der Einwilligung)
-- confirmed_*    Zeitpunkt/IP der Bestätigung
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS confirmed       BOOLEAN DEFAULT false;
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS confirm_token   UUID    DEFAULT gen_random_uuid();
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS consent_at      TIMESTAMPTZ;
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS consent_ip      TEXT;
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS confirmed_at    TIMESTAMPTZ;
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS confirm_ip      TEXT;
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_confirm_token_idx
  ON newsletter_subscribers (confirm_token);

-- Bisherige Abonnenten haben nie bestätigt → gelten als NICHT bestätigt
-- (confirmed = false). Wer weiter Newsletter bekommen soll, muss sich neu
-- anmelden und bestätigen.

-- Anmeldungen laufen jetzt nur noch über die Funktion newsletter-welcome.
-- Das direkte Eintragen aus dem Browser wird abgeschaltet, damit niemand
-- das Double-Opt-in umgehen kann.
DROP POLICY IF EXISTS "Newsletter abonnieren" ON newsletter_subscribers;

-- ── Bestellungen: Einwilligung „Versandbenachrichtigung“ ──────
-- Nur wenn true, gehen E-Mail/Telefon an den Paketdienst (Senddrop).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_notify_consent BOOLEAN DEFAULT false;
