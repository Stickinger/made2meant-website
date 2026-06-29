-- ============================================================
-- STICKFACTORY — Supabase Datenbank Setup
-- Dieses SQL einmal im Supabase SQL Editor ausführen
-- ============================================================


-- ── PRODUKTE ─────────────────────────────────────────────────
CREATE TABLE products (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  price       NUMERIC(10,2) NOT NULL,
  stock       INTEGER NOT NULL DEFAULT 0,
  image_url   TEXT,
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── PROFILE (erweitert auth.users) ───────────────────────────
CREATE TABLE profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  first_name  TEXT,
  last_name   TEXT,
  street      TEXT,
  zip         TEXT,
  city        TEXT,
  country     TEXT DEFAULT 'AT',
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ── BESTELLUNGEN ─────────────────────────────────────────────
CREATE TABLE orders (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email       TEXT,
  first_name  TEXT,
  last_name   TEXT,
  address     TEXT,
  zip         TEXT,
  city        TEXT,
  country     TEXT,
  subtotal    NUMERIC(10,2) NOT NULL,
  shipping    NUMERIC(10,2) NOT NULL DEFAULT 0,
  total       NUMERIC(10,2) NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','processing','shipped','delivered','cancelled')),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── BESTELLPOSITIONEN ────────────────────────────────────────
CREATE TABLE order_items (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id    UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  product_id  UUID REFERENCES products(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  price       NUMERIC(10,2) NOT NULL,
  quantity    INTEGER NOT NULL DEFAULT 1
);


-- ============================================================
-- SICHERHEIT (Row Level Security)
-- Bestimmt wer was lesen/schreiben darf
-- ============================================================

ALTER TABLE products   ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Produkte: jeder darf lesen, nur eingeloggte Admins schreiben
CREATE POLICY "Produkte öffentlich lesbar"
  ON products FOR SELECT USING (active = true);

-- Profile: nur eigenes Profil lesen & schreiben
CREATE POLICY "Eigenes Profil lesen"
  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Eigenes Profil schreiben"
  ON profiles FOR ALL USING (auth.uid() = id);

-- Bestellungen: eigene Bestellungen sehen
CREATE POLICY "Eigene Bestellungen lesen"
  ON orders FOR SELECT USING (auth.uid() = user_id);
-- Neue Bestellung anlegen (auch ohne Login = Gastbestellung)
CREATE POLICY "Bestellung aufgeben"
  ON orders FOR INSERT WITH CHECK (true);

-- Bestellpositionen: nur wenn Bestellung gehört zu mir
CREATE POLICY "Eigene Bestellpositionen"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
        AND orders.user_id = auth.uid()
    )
  );
CREATE POLICY "Bestellpositionen anlegen"
  ON order_items FOR INSERT WITH CHECK (true);


-- ============================================================
-- ADMIN-ZUGRIFF
-- Damit das Admin-Panel auf alle Daten zugreifen kann,
-- brauchst du eine "service_role" Policy ODER du arbeitest
-- mit dem Supabase Dashboard direkt.
--
-- Einfachste Lösung für den Anfang:
-- Im Admin-Panel den Supabase Service Key verwenden
-- (NIEMALS im Frontend — nur serverseitig!)
-- ============================================================

-- Admins dürfen alle Produkte sehen (auch inaktive)
CREATE POLICY "Admin liest alle Produkte"
  ON products FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

-- Admins dürfen alle Bestellungen sehen
CREATE POLICY "Admin liest alle Bestellungen"
  ON orders FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin liest alle Bestellpositionen"
  ON order_items FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');


-- ============================================================
-- PROFIL AUTOMATISCH ANLEGEN bei Registrierung
-- Trigger: wenn neuer User → leeres Profil erstellen
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ============================================================
-- BEISPIEL-PRODUKTE (optional, zum Testen)
-- ============================================================

INSERT INTO products (name, slug, description, price, stock, active) VALUES
  ('Galaxy Sticker Pack', 'galaxy-sticker-pack', 'Hochwertiger Vinyl-Sticker mit Galaxy-Motiv. Wetterfest & UV-beständig.', 4.99, 150, true),
  ('Skateboard Tiger', 'skateboard-tiger', 'Cooler Tiger-Sticker im Streetart-Stil. Perfekt für Boards und Helme.', 3.49, 200, true),
  ('Blumen Set (5er)', 'blumen-set-5er', '5 verschiedene Blumen-Sticker. Pastellfarben, extra stark haftend.', 7.99, 80, true),
  ('Retro Wave', 'retro-wave', 'Synthwave Ästhetik auf Vinyl. Größe 10x10cm.', 5.99, 120, true);
