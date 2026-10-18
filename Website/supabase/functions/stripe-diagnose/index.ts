// ============================================================
// made2meant — Stripe-Diagnose (NUR LESEND, nur für Admins)
// Zeigt, in welcher Umgebung der Key läuft, welche Webhooks Stripe dort
// kennt, ob Zahlungs-Events an einen Webhook geschickt wurden und wie die
// letzten Bestellungen in der DB stehen. Gibt KEINE Schlüssel aus.
// Deploy:  supabase functions deploy stripe-diagnose   (mit JWT-Prüfung)
// Aufruf (Admin-Konsole):
//   const d = await db.functions.invoke('stripe-diagnose',{body:{}});
//   console.log(JSON.stringify(d.data ?? d.error, null, 2))
// Nach der Fehlersuche wieder löschen: supabase functions delete stripe-diagnose
// ============================================================
import Stripe from 'https://esm.sh/stripe@16.9.0?target=denonext'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}
const iso = (t: number) => new Date(t * 1000).toISOString()
const msg = (e: unknown) => String((e as Error)?.message || e)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // ── Nur Admins ──
    const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    })
    const { data: { user } } = await caller.auth.getUser()
    if (!user) return json({ error: 'Nicht eingeloggt' }, 401)
    const { data: adminRow } = await service.from('admins').select('user_id').eq('user_id', user.id).maybeSingle()
    if (!adminRow) return json({ error: 'Keine Admin-Berechtigung' }, 403)

    const key = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
    const whsec = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
    const out: Record<string, unknown> = {
      keyMode: key.startsWith('sk_live') ? 'live' : key.startsWith('sk_test') ? 'test/sandbox'
        : key.startsWith('rk_live') ? 'live (restricted)' : key.startsWith('rk_test') ? 'test (restricted)' : 'unbekannt',
      webhookSecretFormatOk: whsec.startsWith('whsec_'),
    }
    const stripe = new Stripe(key, { apiVersion: '2024-06-20' })

    try {
      const acct = await stripe.accounts.retrieve()
      out.account = { id: acct.id, charges_enabled: acct.charges_enabled, payouts_enabled: acct.payouts_enabled }
    } catch (e) { out.accountError = msg(e) }

    try {
      const eps = await stripe.webhookEndpoints.list({ limit: 10 })
      out.webhookEndpoints = eps.data.map((e) => ({
        id: e.id, url: e.url, status: e.status, events: e.enabled_events, api_version: e.api_version, livemode: e.livemode,
      }))
    } catch (e) { out.webhookEndpointsError = msg(e) }

    try {
      const ev = await stripe.events.list({ type: 'checkout.session.completed', limit: 5 })
      out.recentCheckoutEvents = ev.data.map((e) => {
        const s = e.data.object as Stripe.Checkout.Session
        return {
          id: e.id, created: iso(e.created), livemode: e.livemode,
          pending_webhooks: e.pending_webhooks,            // >0 = Stripe versucht noch zuzustellen
          order_id: s.metadata?.order_id ?? null, payment_status: s.payment_status,
        }
      })
    } catch (e) { out.recentCheckoutEventsError = msg(e) }

    try {
      const ss = await stripe.checkout.sessions.list({ limit: 5 })
      out.recentSessions = ss.data.map((s) => ({
        id: s.id, created: iso(s.created), livemode: s.livemode, status: s.status,
        payment_status: s.payment_status, amount_total: s.amount_total, order_id: s.metadata?.order_id ?? null,
      }))
    } catch (e) { out.recentSessionsError = msg(e) }

    const { data: orders, error: ordErr } = await service.from('orders')
      .select('id, status, total, stripe_session_id, created_at, notes')
      .order('created_at', { ascending: false }).limit(6)
    if (ordErr) out.recentOrdersError = ordErr.message
    out.recentOrders = (orders || []).map((o: any) => ({
      id: o.id, created: o.created_at, status: o.status, total: o.total,
      stripe_session_id: o.stripe_session_id, transfer: String(o.notes || '').includes('Überweisung'),
    }))

    return json(out)
  } catch (e) {
    return json({ error: msg(e) }, 500)
  }
})
