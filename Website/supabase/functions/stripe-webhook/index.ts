// ============================================================
// made2meant — Stripe Webhook (setzt Bestellung auf "bezahlt")
// Deploy:  supabase functions deploy stripe-webhook --no-verify-jwt
// Secrets: supabase secrets set STRIPE_SECRET_KEY=sk_live_...
//          supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
// Im Stripe-Dashboard einen Webhook auf die Funktions-URL anlegen,
// Event: checkout.session.completed
// ============================================================
import Stripe from 'https://esm.sh/stripe@16.9.0?target=denonext'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { apiVersion: '2024-06-20' })
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature!, webhookSecret)
  } catch (e) {
    return new Response('Ungültige Signatur: ' + String((e as Error)?.message || e), { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const orderId = session.metadata?.order_id
    if (orderId) {
      const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
      await admin.from('orders')
        .update({ status: 'processing' })
        .eq('id', orderId)

      // Rabattcode-Nutzung zählen (nur bei bezahlter Bestellung)
      const { data: o } = await admin.from('orders').select('discount_code').eq('id', orderId).single()
      if (o?.discount_code) {
        await admin.rpc('increment_discount_use', { p_code: o.discount_code })
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
})
