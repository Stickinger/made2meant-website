// ============================================================
// made2meant — Stripe Webhook (setzt Bestellung auf "bezahlt")
// Deploy:  supabase functions deploy stripe-webhook --no-verify-jwt
// Secrets: supabase secrets set STRIPE_SECRET_KEY=sk_live_...
//          supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
// Im Stripe-Dashboard einen Webhook auf die Funktions-URL anlegen,
// Event: checkout.session.completed
//
// Stripe schickt Events bei Fehlern/Timeouts erneut. Deshalb wird nur
// eine noch offene (pending) Bestellung auf "processing" gesetzt — nur
// dann wird der Rabattcode gezählt und die Mail ausgelöst. Wiederholte
// Events ändern nichts mehr (kein Doppelzählen, kein Zurücksetzen eines
// schon "versendet"-Status).
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
    // Nur tatsächlich bezahlte Sessions (bei verzögerten Zahlarten ist
    // payment_status hier noch "unpaid")
    if (orderId && session.payment_status === 'paid') {
      const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
      const { data: updated } = await admin.from('orders')
        .update({ status: 'processing', stripe_session_id: session.id })
        .eq('id', orderId)
        .eq('status', 'pending')
        .select('discount_code')

      // Nur beim ersten Event dieser Bestellung weitermachen
      if (updated && updated.length) {
        const code = updated[0].discount_code
        if (code) await admin.rpc('increment_discount_use', { p_code: code })

        // Benachrichtigung an den Shop-Betreiber auslösen (bezahlte Bestellung)
        try {
          await fetch(Deno.env.get('SUPABASE_URL')! + '/functions/v1/notify-order', {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ order_id: orderId }),
          })
        } catch (_) { /* Benachrichtigung darf die Zahlung nie blockieren */ }
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
})
