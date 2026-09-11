-- ============================================================
-- made2meant — Website-Bilder im Admin verwalten
-- Im Supabase SQL-Editor ausführen (einmalig).
-- Macht NUR den Schlüssel 'site_images' öffentlich lesbar,
-- damit Startseite & Über-uns die Bilder live laden können.
-- Alle anderen Einstellungen (z. B. E-Mail-Empfänger) bleiben admin-only.
-- ============================================================

-- Leeren Eintrag anlegen (falls noch nicht vorhanden)
INSERT INTO settings (key, value)
VALUES ('site_images', '{}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Öffentliche Lese-Berechtigung NUR für diesen einen Schlüssel
DROP POLICY IF EXISTS "Oeffentlich: Website-Bilder lesbar" ON settings;
CREATE POLICY "Oeffentlich: Website-Bilder lesbar"
  ON settings FOR SELECT
  TO anon, authenticated
  USING (key = 'site_images');
