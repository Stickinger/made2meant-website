// ============================================================
// made2meant — Stripe Checkout Session erstellen
// Deploy:  supabase functions deploy create-checkout-session
// Secrets: supabase secrets set STRIPE_SECRET_KEY=sk_live_...
// (SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY werden automatisch gesetzt)
//
// SICHERHEIT: Die Preise werden serverseitig aus den echten Produktdaten
// nachgerechnet (Grundpreis + gewählte Stickstellen). Manipulierte Beträge
// aus dem Browser werden ignoriert.
// ============================================================
import Stripe from 'https://esm.sh/stripe@16.9.0?target=denonext'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { apiVersion: '2024-06-20' })

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { order_id, success_url, cancel_url } = await req.json()
    if (!order_id) return json({ error: 'order_id fehlt' }, 400)

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: order, error } = await admin
      .from('orders').select('*, order_items(*)').eq('id', order_id).single()
    if (error || !order) return json({ error: 'Bestellung nicht gefunden' }, 404)
    if (order.status !== 'pending') return json({ error: 'Bestellung ist nicht offen' }, 400)

    // Echte Produktdaten laden (Preise + Stickstellen)
    const productIds = [...new Set((order.order_items || []).map((i: any) => i.product_id).filter(Boolean))]
    const productMap: Record<string, any> = {}
    if (productIds.length) {
      const { data: prods } = await admin.from('products').select('id, price, positions').in('id', productIds)
      for (const p of prods || []) productMap[p.id] = p
    }

    // Pro Position den korrekten Stückpreis nachrechnen
    function trueUnitPrice(item: any): number {
      const p = item.product_id ? productMap[item.product_id] : null
      if (!p) return Number(item.price) || 0 // kein Produktbezug → gespeicherten Preis nutzen
      const opts = item.options || {}
      const base = Number(p.price) || 0
      const add = (p.positions || []).reduce(
        (s: number, pos: any) => s + (Object.prototype.hasOwnProperty.call(opts, pos.label) ? (Number(pos.price) || 0) : 0),
        0,
      )
      return base + add
    }

    let subtotal = 0
    const line_items = (order.order_items || []).map((i: any) => {
      const unit = trueUnitPrice(i)
      const qty = Math.max(1, parseInt(i.quantity) || 1)
      subtotal += unit * qty
      return {
        price_data: { currency: 'eur', product_data: { name: i.name }, unit_amount: Math.round(unit * 100) },
        quantity: qty,
      }
    })

    // Versand serverseitig bestimmen (frei ab 69 €)
    const shipping = subtotal >= 69 ? 0 : 3.90
    if (shipping > 0) {
      line_items.push({
        price_data: { currency: 'eur', product_data: { name: 'Versand' }, unit_amount: Math.round(shipping * 100) },
        quantity: 1,
      })
    }

    // Bestellung auf die geprüften Beträge korrigieren
    await admin.from('orders')
      .update({ subtotal, shipping, total: subtotal + shipping })
      .eq('id', order_id)

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: order.email || undefined,
      line_items,
      success_url,
      cancel_url,
      metadata: { order_id: String(order_id) },
      payment_intent_data: { metadata: { order_id: String(order_id) } },
    })

    return json({ url: session.url })
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500)
  }
})
