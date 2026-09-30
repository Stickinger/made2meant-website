// ============================================================
// made2meant — Widerruf (gesetzlicher Widerrufsbutton)
//   1) Widerruf in Tabelle withdrawals speichern
//   2) Empfangsbestätigung an den Kunden (dauerhafter Datenträger)
//   3) Benachrichtigung an den Shop
//
// Deploy:  supabase functions deploy notify-withdrawal --no-verify-jwt
// Secrets: RESEND_API_KEY, ORDER_FROM_EMAIL, optional REPLY_TO_EMAIL, SITE_URL
//          (dieselben wie notify-order)
// Vorher:  Tabelle withdrawals anlegen — siehe widerruf-setup.sql
//
// Hinweis: Die Kunden-Bestätigungsmail geht erst zuverlässig raus, wenn
//          die Absender-Domain bei Resend verifiziert ist. Bis dahin wird
//          der Widerruf trotzdem gespeichert und der Shop benachrichtigt.
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
function esc(s: unknown) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
}
async function sendMail(payload: Record<string, unknown>) {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) return { ok: false, detail: 'RESEND_API_KEY nicht gesetzt' }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: Deno.env.get('ORDER_FROM_EMAIL') || 'made2meant <onboarding@resend.dev>',
      reply_to: Deno.env.get('REPLY_TO_EMAIL') || 'office@made2meant.com',
      ...payload,
    }),
  })
  return { ok: res.ok, detail: res.ok ? '' : (await res.text()).slice(0, 300) }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const b = await req.json()
    const order_ref  = String(b.order_ref || '').trim()
    const first_name = String(b.first_name || '').trim()
    const last_name  = String(b.last_name || '').trim()
    const email      = String(b.email || '').trim()
    const order_date    = b.order_date ? String(b.order_date) : null
    const received_date = b.received_date ? String(b.received_date) : null
    const note       = b.note ? String(b.note).slice(0, 2000) : null

    if (!order_ref || !first_name || !last_name || !email) {
      return json({ error: 'Bitte Bestellnummer, Name und E-Mail angeben.' }, 400)
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const site = (Deno.env.get('SITE_URL') || 'https://made2meant.com').replace(/\/$/, '')

    // 1) Speichern
    const { data: saved, error: insErr } = await admin.from('withdrawals').insert({
      order_ref, first_name, last_name, email, order_date, received_date, note,
    }).select().single()
    if (insErr) return json({ error: 'Konnte nicht gespeichert werden: ' + insErr.message }, 500)

    const ref = '#' + String(saved.id).slice(0, 8).toUpperCase()
    const received = new Date().toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const details = `
      <table style="font-size:14px;border-collapse:collapse">
        <tr><td style="padding:3px 14px 3px 0;color:#8a8580">Bestellnummer</td><td style="padding:3px 0"><b>${esc(order_ref)}</b></td></tr>
        <tr><td style="padding:3px 14px 3px 0;color:#8a8580">Name</td><td style="padding:3px 0">${esc(first_name)} ${esc(last_name)}</td></tr>
        <tr><td style="padding:3px 14px 3px 0;color:#8a8580">E-Mail</td><td style="padding:3px 0">${esc(email)}</td></tr>
        ${order_date ? `<tr><td style="padding:3px 14px 3px 0;color:#8a8580">Bestellt am</td><td style="padding:3px 0">${esc(order_date)}</td></tr>` : ''}
        ${received_date ? `<tr><td style="padding:3px 14px 3px 0;color:#8a8580">Erhalten am</td><td style="padding:3px 0">${esc(received_date)}</td></tr>` : ''}
        ${note ? `<tr><td style="padding:3px 14px 3px 0;color:#8a8580">Anmerkung</td><td style="padding:3px 0">${esc(note)}</td></tr>` : ''}
        <tr><td style="padding:3px 14px 3px 0;color:#8a8580">Eingegangen am</td><td style="padding:3px 0">${received}</td></tr>
      </table>`

    const result: Record<string, unknown> = { ok: true, id: saved.id }

    // 2) Empfangsbestätigung an den Kunden
    const custMail = await sendMail({
      to: [email],
      subject: `Bestätigung: Widerruf ${esc(order_ref)} eingegangen`,
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1c1c1c">
          <p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#7a6d64;margin:0 0 6px">Widerruf</p>
          <h1 style="font-size:22px;margin:0 0 10px;color:#2B120E">Wir haben deinen Widerruf erhalten.</h1>
          <p style="font-size:15px;line-height:1.6;color:#4a4540;margin:0 0 18px">
            Hallo ${esc(first_name)}, hiermit bestätigen wir den Eingang deiner Widerrufserklärung. Diese E-Mail dient als Bestätigung auf einem dauerhaften Datenträger.
          </p>
          ${details}
          <p style="font-size:14px;line-height:1.6;color:#4a4540;margin:20px 0 0">
            Wir prüfen deinen Widerruf und melden uns zeitnah zur Rückabwicklung. Bitte beachte, dass eigens für dich personalisierte Artikel gesetzlich vom Rücktrittsrecht ausgenommen sein können (Details in unserer <a href="${site}/agb.html" style="color:#8a5a3b">Widerrufsbelehrung</a>).
          </p>
          <p style="margin:24px 0 0;font-size:11px;color:#a9a49c;line-height:1.6">
            Made2Meant GmbH · Franz-Broschek-Platz 5a · 2514 Möllersdorf · Österreich
          </p>
        </div>`,
    })
    result.customer = custMail.ok ? 'gesendet' : ('nicht gesendet: ' + custMail.detail)

    // 3) Shop-Benachrichtigung (an konfigurierte Empfänger, sonst reply-to-Adresse)
    const { data: setting } = await admin.from('settings').select('value').eq('key', 'order_notification_emails').maybeSingle()
    const recipients: string[] = Array.isArray(setting?.value) && setting!.value.length
      ? setting!.value
      : [Deno.env.get('REPLY_TO_EMAIL') || 'office@made2meant.com']
    const shopMail = await sendMail({
      to: recipients,
      reply_to: email,
      subject: `Neuer Widerruf ${esc(order_ref)}`,
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1c1c1c">
          <h2 style="color:#2B120E;margin:0 0 12px">Neuer Widerruf ${ref}</h2>
          ${details}
          <p style="margin:22px 0 0"><a href="${site}/admin" style="background:#2B120E;color:#F2F1EC;padding:10px 18px;border-radius:999px;text-decoration:none;font-size:14px">Im Admin ansehen</a></p>
        </div>`,
    })
    result.shop = shopMail.ok ? 'gesendet' : ('nicht gesendet: ' + shopMail.detail)

    return json(result)
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500)
  }
})
