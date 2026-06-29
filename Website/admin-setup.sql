-- ============================================================
-- MADE2MEANT — Erweitertes Admin Setup
-- Im Supabase SQL Editor ausführen
-- ============================================================

-- ── KATEGORIEN ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url   TEXT,
  featured    BOOLEAN DEFAULT false,
  sort_order  INTEGER DEFAULT 0,
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── PRODUKTE ERWEITERN ───────────────────────────────────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_title TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS compare_price NUMERIC(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- ── RABATTCODES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS discount_codes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  type        TEXT NOT NULL CHECK (type IN ('percentage', 'fixed')),
  value       NUMERIC(10,2) NOT NULL,
  min_order   NUMERIC(10,2) DEFAULT 0,
  max_uses    INTEGER,
  used_count  INTEGER DEFAULT 0,
  expires_at  TIMESTAMPTZ,
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── BESTELLUNGEN ERWEITERN ───────────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;

-- ── SEITENAUFRUFE TRACKING ───────────────────────────────────
CREATE TABLE IF NOT EXISTS page_views (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page        TEXT NOT NULL,
  referrer    TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── NEWSLETTER ABONNENTEN ────────────────────────────────────
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT,
  active        BOOLEAN DEFAULT true,
  subscribed_at TIMESTAMPTZ DEFAULT now()
);

-- ── NEWSLETTER ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS newsletters (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subject         TEXT NOT NULL,
  content         TEXT NOT NULL,
  status          TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent')),
  sent_at         TIMESTAMPTZ,
  recipient_count INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── RLS POLICIES ─────────────────────────────────────────────
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletters ENABLE ROW LEVEL SECURITY;

-- Kategorien: öffentlich lesbar
CREATE POLICY "Kategorien öffentlich lesbar"
  ON categories FOR SELECT USING (active = true);

-- Page Views: jeder darf schreiben (Tracking)
CREATE POLICY "Page views tracken"
  ON page_views FOR INSERT WITH CHECK (true);

-- Newsletter abonnieren
CREATE POLICY "Newsletter abonnieren"
  ON newsletter_subscribers FOR INSERT WITH CHECK (true);

-- ── BEISPIEL-KATEGORIEN ──────────────────────────────────────
INSERT INTO categories (name, slug, description, featured, sort_order) VALUES
  ('Stickereien', 'stickereien', 'Personalisierte Stickereien für jeden Anlass', true, 1),
  ('Geschenke', 'geschenke', 'Individuelle Geschenkideen', true, 2),
  ('Sale', 'sale', 'Aktuelle Angebote', false, 3)
ON CONFLICT (slug) DO NOTHING;
