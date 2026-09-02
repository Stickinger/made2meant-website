-- ============================================================
-- MADE2MEANT — Bestell-Management im Kundenkonto
-- Im Supabase SQL Editor ausführen (einmalig, nach admin-fix.sql).
--
-- Sichere Aktionen für Kund:innen: Adresse ändern & stornieren nur für
-- EIGENE, noch nicht versandte Bestellungen — über geschützte Funktionen
-- (kein offener Schreibzugriff auf die orders-Tabelle).
-- ============================================================

-- 1. Lieferadresse einer eigenen, offenen Bestellung ändern
CREATE OR REPLACE FUNCTION update_order_address(
  p_order uuid, p_first text, p_last text, p_address text,
  p_zip text, p_city text, p_country text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE orders
     SET first_name = p_first, last_name = p_last, address = p_address,
         zip = p_zip, city = p_city, country = p_country
   WHERE id = p_order
     AND user_id = auth.uid()
     AND status IN ('pending', 'processing');
END $$;

-- 2. Eigene, offene Bestellung stornieren
CREATE OR REPLACE FUNCTION cancel_own_order(p_order uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE orders SET status = 'cancelled'
   WHERE id = p_order
     AND user_id = auth.uid()
     AND status = 'pending';
END $$;

-- 3. Reklamationen / Problemmeldungen
CREATE TABLE IF NOT EXISTS order_complaints (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id   uuid REFERENCES orders(id) ON DELETE CASCADE,
  user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  subject    text,
  message    text NOT NULL,
  status     text DEFAULT 'offen' CHECK (status IN ('offen', 'in_bearbeitung', 'erledigt')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE order_complaints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Eigene Reklamationen lesen" ON order_complaints;
CREATE POLICY "Eigene Reklamationen lesen"
  ON order_complaints FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Reklamation anlegen" ON order_complaints;
CREATE POLICY "Reklamation anlegen"
  ON order_complaints FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM orders WHERE orders.id = order_id AND orders.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admin verwaltet Reklamationen" ON order_complaints;
CREATE POLICY "Admin verwaltet Reklamationen"
  ON order_complaints FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());
