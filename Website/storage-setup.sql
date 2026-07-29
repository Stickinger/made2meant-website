-- ============================================================
-- MADE2MEANT — Datei-Upload für Produktbilder (Supabase Storage)
-- Im Supabase SQL Editor ausführen (einmalig, NACH admin-fix.sql).
--
-- Legt einen öffentlichen Speicher-Ordner "product-images" an und
-- erlaubt nur Admins das Hochladen. Danach kannst du im Admin-Panel
-- Fotos (PNG/JPEG/WEBP/PDF) direkt hochladen statt eine URL einzufügen.
-- ============================================================

-- 1. Öffentlichen Bucket anlegen
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Jeder darf die Bilder ansehen (öffentlicher Shop)
DROP POLICY IF EXISTS "Produktbilder öffentlich lesbar" ON storage.objects;
CREATE POLICY "Produktbilder öffentlich lesbar"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

-- 3. Nur Admins dürfen hochladen / ersetzen / löschen
--    (is_admin() stammt aus admin-fix.sql)
DROP POLICY IF EXISTS "Admin lädt Produktbilder hoch" ON storage.objects;
CREATE POLICY "Admin lädt Produktbilder hoch"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images' AND is_admin());

DROP POLICY IF EXISTS "Admin ersetzt Produktbilder" ON storage.objects;
CREATE POLICY "Admin ersetzt Produktbilder"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'product-images' AND is_admin());

DROP POLICY IF EXISTS "Admin löscht Produktbilder" ON storage.objects;
CREATE POLICY "Admin löscht Produktbilder"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images' AND is_admin());
