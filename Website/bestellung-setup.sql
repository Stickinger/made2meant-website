-- ============================================================
-- made2meant — Bestellen auch ohne Kundenkonto (Gastbestellung)
-- Im Supabase SQL-Editor ausführen (einmalig).
--
-- Problem: Die Kasse hat die Bestellung angelegt und sofort wieder
-- ausgelesen. Gäste dürfen Bestellungen (zu Recht) nicht lesen →
-- „new row violates row-level security policy for table orders".
--
-- Lösung: zwei geschützte Funktionen (SECURITY DEFINER):
--   place_order        legt Bestellung + Positionen an, gibt nur die ID zurück
--   get_order_summary  liefert GENAU EINE Bestellung für die Danke-Seite —
--                      nur wer die (nicht erratbare) Bestell-ID kennt
-- Die Tabelle orders bleibt für Fremde weiterhin nicht lesbar.
-- ============================================================

CREATE OR REPLACE FUNCTION place_order(p_order JSONB, p_items JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF coalesce(trim(p_order->>'email'), '') = '' THEN
    RAISE EXCEPTION 'E-Mail fehlt';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Warenkorb ist leer';
  END IF;

  -- Status & Kundenkonto setzt der Server (nicht fälschbar). Beträge werden
  -- vor der Zahlung serverseitig nachgerechnet (create-checkout-session).
  INSERT INTO orders (
    user_id, email, first_name, last_name, address, zip, city, country,
    subtotal, shipping, discount_code, discount_amount, total, status, notes,
    shipping_notify_consent
  ) VALUES (
    auth.uid(),
    trim(p_order->>'email'),
    p_order->>'first_name', p_order->>'last_name', p_order->>'address',
    p_order->>'zip', p_order->>'city', coalesce(p_order->>'country', 'AT'),
    coalesce((p_order->>'subtotal')::numeric, 0),
    coalesce((p_order->>'shipping')::numeric, 0),
    nullif(p_order->>'discount_code', ''),
    coalesce((p_order->>'discount_amount')::numeric, 0),
    coalesce((p_order->>'total')::numeric, 0),
    'pending',
    p_order->>'notes',
    coalesce((p_order->>'shipping_notify_consent')::boolean, false)
  )
  RETURNING id INTO v_id;

  INSERT INTO order_items (order_id, product_id, name, price, quantity, options)
  SELECT
    v_id,
    -- nur echte, vorhandene Produkte verknüpfen
    (SELECT pr.id FROM products pr
      WHERE (i->>'product_id') ~* '^[0-9a-f-]{36}$' AND pr.id = (i->>'product_id')::uuid),
    coalesce(nullif(i->>'name', ''), 'Artikel'),
    coalesce((i->>'price')::numeric, 0),
    greatest(1, coalesce((i->>'quantity')::int, 1)),
    coalesce(i->'options', '{}'::jsonb)
  FROM jsonb_array_elements(p_items) AS i;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION place_order(JSONB, JSONB) TO anon, authenticated;


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
    'tracking_number', o.tracking_number, 'tracking_link', o.tracking_link,
    'shipping_carrier', o.shipping_carrier,
    'order_items', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'name', it.name, 'price', it.price, 'quantity', it.quantity, 'options', it.options,
        'image', p.image_url))
      FROM order_items it
      LEFT JOIN products p ON p.id = it.product_id
      WHERE it.order_id = o.id), '[]'::jsonb)
  )
  FROM orders o
  WHERE o.id = p_id;
$$;

GRANT EXECUTE ON FUNCTION get_order_summary(UUID) TO anon, authenticated;
