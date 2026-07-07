-- ============================================================
-- MADE2MEANT — Admin-Fix + Produktvarianten
-- Im Supabase SQL Editor ausführen (einmalig).
--
-- Behebt: Produkte lassen sich im Admin nicht speichern.
-- Ursache: Die alten Policies prüfen auth.jwt()->>'role' = 'admin',
-- aber Supabase setzt im JWT immer role='authenticated'. Ein von
-- RLS blockiertes UPDATE ändert still 0 Zeilen — ohne Fehlermeldung.
-- ============================================================

-- ── 1. ADMIN-TABELLE ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Jeder darf nur die eigene Zeile sehen (für den Admin-Check im Panel)
DROP POLICY IF EXISTS "Eigene Admin-Zeile lesen" ON admins;
CREATE POLICY "Eigene Admin-Zeile lesen"
  ON admins FOR SELECT USING (auth.uid() = user_id);

-- Prüffunktion: läuft mit erhöhten Rechten, damit sie in Policies
-- anderer Tabellen ohne Rekursion nutzbar ist
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid());
$$;

-- ── 2. KAPUTTE POLICIES ERSETZEN ─────────────────────────────
DROP POLICY IF EXISTS "Admin liest alle Produkte"         ON products;
DROP POLICY IF EXISTS "Admin liest alle Bestellungen"     ON orders;
DROP POLICY IF EXISTS "Admin liest alle Bestellpositionen" ON order_items;

CREATE POLICY "Admin verwaltet Produkte"
  ON products FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admin verwaltet Bestellungen"
  ON orders FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admin verwaltet Bestellpositionen"
  ON order_items FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- ── 3. FEHLENDE SCHREIB-POLICIES ERGÄNZEN ────────────────────
DROP POLICY IF EXISTS "Admin verwaltet Kategorien" ON categories;
CREATE POLICY "Admin verwaltet Kategorien"
  ON categories FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin verwaltet Rabattcodes" ON discount_codes;
CREATE POLICY "Admin verwaltet Rabattcodes"
  ON discount_codes FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin verwaltet Newsletter" ON newsletters;
CREATE POLICY "Admin verwaltet Newsletter"
  ON newsletters FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin liest Abonnenten" ON newsletter_subscribers;
CREATE POLICY "Admin liest Abonnenten"
  ON newsletter_subscribers FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin liest Page Views" ON page_views;
CREATE POLICY "Admin liest Page Views"
  ON page_views FOR SELECT USING (is_admin());

-- ── 4. PRODUKTVARIANTEN (Optionen + mehrere Bilder) ──────────
-- options: z.B. [{"name":"Schriftfarbe","values":["Grün","Braun"]},
--                {"name":"Polsterfarbe","values":["Creme","Braun"]}]
ALTER TABLE products ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '[]';

-- Bilder pro Produkt, optional an Optionswerte gebunden:
-- option_values: z.B. {"Schriftfarbe":"Grün","Polsterfarbe":"Braun"}
-- Leeres Objekt {} = allgemeines Bild (gilt für jede Auswahl)
CREATE TABLE IF NOT EXISTS product_images (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id    UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  url           TEXT NOT NULL,
  option_values JSONB DEFAULT '{}',
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Produktbilder öffentlich lesbar" ON product_images;
CREATE POLICY "Produktbilder öffentlich lesbar"
  ON product_images FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin verwaltet Produktbilder" ON product_images;
CREATE POLICY "Admin verwaltet Produktbilder"
  ON product_images FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- Optionen der Bestellposition (z.B. gewählte Farben)
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '{}';

-- ── 5. DICH SELBST ALS ADMIN EINTRAGEN ───────────────────────
-- E-Mail anpassen, dann ausführen:
INSERT INTO admins (user_id)
SELECT id FROM auth.users WHERE email = 'DEINE-ADMIN-EMAIL@BEISPIEL.AT'
ON CONFLICT (user_id) DO NOTHING;
