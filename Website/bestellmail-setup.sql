-- ============================================================
-- made2meant — Bestellbestätigung an Kunden + Bankdaten
-- Im Supabase SQL-Editor ausführen (einmalig, nach bestellung-setup.sql).
-- ============================================================

-- Jede Kundenbestätigung nur einmal senden
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_notified BOOLEAN DEFAULT false;

-- Bestehende Bestellungen nicht nachträglich anschreiben
UPDATE orders SET customer_notified = true WHERE customer_notified IS DISTINCT FROM true AND created_at < now();

-- Platz für die Bankdaten (Admin → Einstellungen → Bankdaten)
INSERT INTO settings (key, value) VALUES ('bank_details', '{}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Danke-Seite: bei Überweisung zusätzlich die Bankdaten mitliefern
CREATE OR REPLACE FUNCTION get_order_summary(p_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', o.id, 'status', o.status, 'notes', o.notes, 'email', o.email,
    'first_name', o.first_name, 'last_name', o.last_name, 'address', o.address,
    'zip', o.zip, 'city', o.city, 'country', o.country,
    'subtotal', o.subtotal, 'shipping', o.shipping, 'discount_code', o.discount_code,
    'discount_amount', o.discount_amount, 'total', o.total, 'created_at', o.created_at,
    'order_items', coalesce((
      SELECT jsonb_agg(jsonb_build_object('name', it.name, 'price', it.price, 'quantity', it.quantity, 'options', it.options))
      FROM order_items it WHERE it.order_id = o.id), '[]'::jsonb),
    'bank', CASE WHEN o.notes ILIKE '%Überweisung%'
                 THEN (SELECT s.value FROM settings s WHERE s.key = 'bank_details') END
  )
  FROM orders o
  WHERE o.id = p_id;
$$;

GRANT EXECUTE ON FUNCTION get_order_summary(UUID) TO anon, authenticated;
