// ============================================================
// made2meant — Bestell-Benachrichtigung an den Shop-Betreiber
// Deploy:  supabase functions deploy notify-order --no-verify-jwt
// Secrets: supabase secrets set RESEND_API_KEY=re_...
//          (optional) supabase secrets set ORDER_FROM_EMAIL="made2meant <onboarding@resend.dev>"
//
// Wird aufgerufen:
//  - vom stripe-webhook, sobald eine Kartenzahlung bezahlt ist
//  - von der Kasse bei einer Überweisungs-/Vorkasse-Bestellung
//
// Sendet nur, wenn im Admin unter Einstellungen mindestens eine
// Empfänger-Adresse hinterlegt ist. Jede Bestellung wird nur einmal
// gemeldet (Spalte orders.order_notified).
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}
function euro(n: number) { return '€ ' + (Number(n) || 0).toFixed(2).replace('.', ',') }
function esc(s: unknown) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { order_id } = await req.json()
    if (!order_id) return json({ error: 'order_id fehlt' }, 400)

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // Bestellung laden
    const { data: order, error } = await admin
      .from('orders').select('*, order_items(*)').eq('id', order_id).single()
    if (error || !order) return json({ error: 'Bestellung nicht gefunden' }, 404)

    // Schon gemeldet? -> nichts tun (verhindert Doppel-Mails)
    if (order.order_notified) return json({ skipped: 'bereits benachrichtigt' })

    // Empfänger aus den Einstellungen
    const { data: setting } = await admin.from('settings').select('value').eq('key', 'order_notification_emails').maybeSingle()
    const recipients: string[] = Array.isArray(setting?.value) ? setting!.value : []
    if (!recipients.length) return json({ skipped: 'keine Empfänger konfiguriert' })

    const apiKey = Deno.env.get('RESEND_API_KEY')
    if (!apiKey) return json({ error: 'RESEND_API_KEY nicht gesetzt' }, 500)
    const from = Deno.env.get('ORDER_FROM_EMAIL') || 'made2meant <onboarding@resend.dev>'

    const shortId = '#' + String(order.id).slice(0, 8).toUpperCase()
    const payLabel = (order.notes || '').includes('Überweisung') ? 'Überweisung (Vorkasse)' : 'Karte (Stripe)'

    const itemRows = (order.order_items || []).map((i: any) => {
      const opts = i.options && Object.keys(i.options).length
        ? '<div style="color:#8a8580;font-size:13px">' +
          Object.entries(i.options).map(([k, v]) => esc(k) + ': ' + esc(v)).join(' · ') + '</div>'
        : ''
      return `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee">${esc(i.name)}${opts}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center">${i.quantity}×</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${euro(i.price * i.quantity)}</td>
      </tr>`
    }).join('')

    const discountRow = order.discount_amount > 0
      ? `<tr><td colspan="2" style="padding:4px 0;color:#c56a47">Rabatt${order.discount_code ? ' (' + esc(order.discount_code) + ')' : ''}</td><td style="padding:4px 0;text-align:right;color:#c56a47">− ${euro(order.discount_amount)}</td></tr>`
      : ''

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1c1c1c">
        <h2 style="color:#c56a47;margin:0 0 4px">Neue Bestellung ${shortId}</h2>
        <p style="color:#8a8580;margin:0 0 20px">Zahlungsart: ${esc(payLabel)}</p>

        <table style="width:100%;border-collapse:collapse;font-size:14px">${itemRows}
          <tr><td colspan="2" style="padding:8px 0 2px">Zwischensumme</td><td style="padding:8px 0 2px;text-align:right">${euro(order.subtotal)}</td></tr>
          ${discountRow}
          <tr><td colspan="2" style="padding:2px 0">Versand</td><td style="padding:2px 0;text-align:right">${order.shipping > 0 ? euro(order.shipping) : 'Kostenlos'}</td></tr>
          <tr><td colspan="2" style="padding:8px 0;font-weight:bold;border-top:2px solid #1c1c1c">Gesamt</td><td style="padding:8px 0;text-align:right;font-weight:bold;border-top:2px solid #1c1c1c">${euro(order.total)}</td></tr>
        </table>

        <h3 style="margin:24px 0 6px">Kunde</h3>
        <p style="margin:0;font-size:14px;line-height:1.6">
          ${esc(order.first_name || '')} ${esc(order.last_name || '')}<br>
          ${esc(order.email || '')}<br>
          ${esc(order.address || '')}<br>
          ${esc(order.zip || '')} ${esc(order.city || '')}, ${esc(order.country || '')}
        </p>

        <p style="margin:24px 0 0"><a href="https://made2meant.at/admin" style="background:#c56a47;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-size:14px">Im Admin ansehen</a></p>
      </div>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: recipients,
        subject: `Neue Bestellung ${shortId} — ${euro(order.total)}`,
        html,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      return json({ error: 'Resend-Fehler', detail: body.slice(0, 300) }, 502)
    }

    // Als benachrichtigt markieren
    await admin.from('orders').update({ order_notified: true }).eq('id', order_id)
    return json({ sent: recipients.length })
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500)
  }
})
