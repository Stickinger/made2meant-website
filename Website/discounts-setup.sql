-- ============================================================
-- made2meant — Rabattcodes: Einlösen absichern
-- Im Supabase SQL-Editor ausführen (einmalig).
--
-- Warum: Die Tabelle discount_codes ist per RLS nur für Admins
-- lesbar (gut — niemand kann deine Codeliste auslesen). Damit die
-- Kasse trotzdem EINEN eingegebenen Code prüfen kann, ohne die
-- ganze Liste offenzulegen, gibt es diese beiden Funktionen.
-- Sie laufen mit erhöhten Rechten (SECURITY DEFINER), verraten aber
-- nur „gültig ja/nein + Rabattbetrag".
-- ============================================================

-- ── Code prüfen (für die Live-Anzeige an der Kasse) ──────────
CREATE OR REPLACE FUNCTION validate_discount(p_code TEXT, p_subtotal NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d discount_codes;
  amt NUMERIC;
BEGIN
  SELECT * INTO d FROM discount_codes
    WHERE upper(code) = upper(trim(p_code)) AND active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Code ungültig.');
  END IF;

  IF d.expires_at IS NOT NULL AND d.expires_at::date < now()::date THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Dieser Code ist abgelaufen.');
  END IF;

  IF d.max_uses IS NOT NULL AND coalesce(d.used_count, 0) >= d.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Dieser Code ist nicht mehr verfügbar.');
  END IF;

  IF coalesce(p_subtotal, 0) < coalesce(d.min_order, 0) THEN
    RETURN jsonb_build_object('valid', false,
      'message', 'Mindestbestellwert ' || to_char(d.min_order, 'FM999999990D00') || ' € nicht erreicht.');
  END IF;

  IF d.type = 'percentage' THEN
    amt := round(coalesce(p_subtotal, 0) * d.value / 100, 2);
  ELSE
    amt := least(d.value, coalesce(p_subtotal, 0));
  END IF;

  RETURN jsonb_build_object('valid', true, 'code', d.code, 'amount', amt);
END;
$$;

GRANT EXECUTE ON FUNCTION validate_discount(TEXT, NUMERIC) TO anon, authenticated;

-- ── Nutzung hochzählen (ruft der Stripe-Webhook nach Zahlung) ─
CREATE OR REPLACE FUNCTION increment_discount_use(p_code TEXT)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE discount_codes
     SET used_count = coalesce(used_count, 0) + 1
   WHERE upper(code) = upper(p_code);
$$;

-- Nur der Server (service_role) soll zählen dürfen:
REVOKE EXECUTE ON FUNCTION increment_discount_use(TEXT) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION increment_discount_use(TEXT) TO service_role;
