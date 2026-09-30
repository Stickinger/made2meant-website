// ============================================================
// made2meant — Bestell-Mails
//   1) Benachrichtigung an den Shop (Empfänger: Admin → Einstellungen)
//   2) Bestellbestätigung an den Kunden
//
// Deploy:  supabase functions deploy notify-order --no-verify-jwt
// Secrets: RESEND_API_KEY=re_...
//          ORDER_FROM_EMAIL="made2meant <bestellung@made2meant.com>"
//            (Absender — Domain muss bei Resend verifiziert sein, sonst
//             gehen Mails nur an die eigene Resend-Konto-Adresse)
//          optional REPLY_TO_EMAIL (Standard: office@made2meant.com)
//          optional SITE_URL      (Standard: https://made2meant.com)
// Vorher:  customer_notified-Spalte + bank_details (siehe SQL im Chat /
//          bestellmail-setup.sql)
//
// Wird aufgerufen:
//  - vom stripe-webhook, sobald eine Kartenzahlung bezahlt ist
//  - von der Kasse bei einer Überweisungs-/Vorkasse-Bestellung
//
// Jede Mail geht pro Bestellung nur einmal raus
// (orders.order_notified / orders.customer_notified).
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
    const { order_id } = await req.json()
    if (!order_id) return json({ error: 'order_id fehlt' }, 400)

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const site = (Deno.env.get('SITE_URL') || 'https://made2meant.com').replace(/\/$/, '')

    const { data: order, error } = await admin
      .from('orders').select('*, order_items(*, products(image_url))').eq('id', order_id).single()
    if (error || !order) return json({ error: 'Bestellung nicht gefunden' }, 404)

    const shortId = '#' + String(order.id).slice(0, 8).toUpperCase()
    const isTransfer = (order.notes || '').includes('Überweisung')
    const payLabel = isTransfer ? 'Überweisung (Vorkasse)' : 'Karte (Stripe)'

    // ── Gemeinsame Bausteine ──
    const itemRows = (order.order_items || []).map((i: any) => {
      const opts = i.options && Object.keys(i.options).length
        ? '<div style="color:#8a8580;font-size:13px;margin-top:2px">' +
          Object.entries(i.options).map(([k, v]) => esc(k) + ': ' + esc(v)).join(' · ') + '</div>'
        : ''
      const img = (i.products && i.products.image_url) || i.image_url || ''
      const thumb = img
        ? `<td style="padding:10px 12px 10px 0;border-bottom:1px solid #eee;width:52px;vertical-align:top"><img src="${esc(img)}" width="48" height="48" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:8px;display:block;border:1px solid #eee"></td>`
        : `<td style="padding:0;border-bottom:1px solid #eee;width:0"></td>`
      return `<tr>
        ${thumb}
        <td style="padding:10px 0;border-bottom:1px solid #eee;vertical-align:top">${esc(i.name)}${opts}</td>
        <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:center;white-space:nowrap;vertical-align:top">${i.quantity}×</td>
        <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;vertical-align:top">${euro(i.price * i.quantity)}</td>
      </tr>`
    }).join('')
    const discountRow = order.discount_amount > 0
      ? `<tr><td colspan="3" style="padding:4px 0;color:#3F6B4C">Rabatt${order.discount_code ? ' (' + esc(order.discount_code) + ')' : ''}</td><td style="padding:4px 0;text-align:right;color:#3F6B4C">− ${euro(order.discount_amount)}</td></tr>`
      : ''
    const summaryTable = `
      <table style="width:100%;border-collapse:collapse;font-size:14px">${itemRows}
        <tr><td colspan="3" style="padding:10px 0 2px">Zwischensumme</td><td style="padding:10px 0 2px;text-align:right">${euro(order.subtotal)}</td></tr>
        ${discountRow}
        <tr><td colspan="3" style="padding:2px 0">Versand</td><td style="padding:2px 0;text-align:right">${order.shipping > 0 ? euro(order.shipping) : 'Kostenlos'}</td></tr>
        <tr><td colspan="3" style="padding:10px 0;font-weight:bold;border-top:2px solid #2B120E">Gesamt</td><td style="padding:10px 0;text-align:right;font-weight:bold;border-top:2px solid #2B120E">${euro(order.total)}</td></tr>
      </table>`
    const addressBlock = `
      ${esc(order.first_name || '')} ${esc(order.last_name || '')}<br>
      ${esc(order.address || '')}<br>
      ${esc(order.zip || '')} ${esc(order.city || '')}, ${esc(order.country || '')}`

    // Reine Text-Fassung (Mails mit Text + HTML landen seltener im Spam)
    const itemsText = (order.order_items || []).map((i: any) => {
      const opts = i.options && Object.keys(i.options).length
        ? ' (' + Object.entries(i.options).map(([k, v]) => `${k}: ${v}`).join(', ') + ')' : ''
      return `- ${i.quantity}x ${i.name}${opts}: ${euro(i.price * i.quantity)}`
    }).join('\n')
    const totalsText = [
      `Zwischensumme: ${euro(order.subtotal)}`,
      order.discount_amount > 0 ? `Rabatt: - ${euro(order.discount_amount)}` : '',
      `Versand: ${order.shipping > 0 ? euro(order.shipping) : 'kostenlos'}`,
      `Gesamt: ${euro(order.total)}`,
    ].filter(Boolean).join('\n')
    const addressText = `${order.first_name || ''} ${order.last_name || ''}\n${order.address || ''}\n${order.zip || ''} ${order.city || ''}, ${order.country || ''}`

    const result: Record<string, unknown> = {}

    // ── 1) Shop-Benachrichtigung ────────────────────────────
    if (order.order_notified) {
      result.shop = 'bereits gesendet'
    } else {
      const { data: setting } = await admin.from('settings').select('value').eq('key', 'order_notification_emails').maybeSingle()
      const recipients: string[] = Array.isArray(setting?.value) ? setting!.value : []
      if (!recipients.length) {
        result.shop = 'keine Empfänger konfiguriert'
      } else {
        const mail = await sendMail({
          to: recipients,
          reply_to: order.email || undefined,
          subject: `Neue Bestellung ${shortId} - ${euro(order.total)}`,
          text: `Neue Bestellung ${shortId}\nZahlungsart: ${payLabel}\n\n${itemsText}\n\n${totalsText}\n\nKunde:\n${addressText}\n${order.email || ''}\n\nIm Admin ansehen: ${site}/admin`,
          html: `
            <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1c1c1c">
              <h2 style="color:#2B120E;margin:0 0 4px">Neue Bestellung ${shortId}</h2>
              <p style="color:#8a8580;margin:0 0 20px">Zahlungsart: ${esc(payLabel)}</p>
              ${summaryTable}
              <h3 style="margin:24px 0 6px">Kunde</h3>
              <p style="margin:0;font-size:14px;line-height:1.6">${addressBlock}<br>${esc(order.email || '')}</p>
              <p style="margin:24px 0 0"><a href="${site}/admin" style="background:#2B120E;color:#F2F1EC;padding:10px 18px;border-radius:999px;text-decoration:none;font-size:14px">Im Admin ansehen</a></p>
            </div>`,
        })
        if (mail.ok) {
          await admin.from('orders').update({ order_notified: true }).eq('id', order.id)
          result.shop = 'gesendet'
        } else result.shop = 'Fehler: ' + mail.detail
      }
    }

    // ── 2) Bestellbestätigung an den Kunden ─────────────────
    // Kartenzahlung erst, wenn Stripe die Zahlung gemeldet hat (nicht mehr "pending")
    if (order.customer_notified) {
      result.customer = 'bereits gesendet'
    } else if (!order.email) {
      result.customer = 'keine E-Mail-Adresse'
    } else if (!isTransfer && order.status === 'pending') {
      result.customer = 'Zahlung noch offen'
    } else {
      let payBlock = ''
      let payText = 'Deine Zahlung ist bei uns eingegangen.'
      if (isTransfer) {
        const { data: bankSetting } = await admin.from('settings').select('value').eq('key', 'bank_details').maybeSingle()
        const b = (bankSetting?.value || {}) as Record<string, string>
        const row = (label: string, value: string) => value
          ? `<tr><td style="padding:4px 12px 4px 0;color:#8a8580">${label}</td><td style="padding:4px 0;font-weight:bold">${esc(value)}</td></tr>` : ''
        payBlock = `
          <div style="background:#F2F1EC;border-radius:16px;padding:18px 20px;margin:0 0 24px">
            <p style="margin:0 0 10px;font-weight:bold">Bitte überweise den Betrag auf unser Konto:</p>
            ${b.iban ? `<table style="font-size:14px;border-collapse:collapse">
              ${row('Empfänger', b.empfaenger || 'Made2Meant GmbH')}
              ${row('IBAN', b.iban)}
              ${row('BIC', b.bic || '')}
              ${row('Bank', b.bank || '')}
              ${row('Betrag', euro(order.total))}
              ${row('Verwendungszweck', shortId)}
            </table>` : `<p style="margin:0;font-size:14px">Betrag: <b>${euro(order.total)}</b> · Verwendungszweck: <b>${shortId}</b>. Unsere Bankdaten schicken wir dir in Kürze.</p>`}
            <p style="margin:12px 0 0;font-size:13px;color:#6b665f">Sobald die Zahlung bei uns ist, beginnen wir mit deiner Bestellung.</p>
          </div>`
        payText = (b.iban
          ? `Bitte überweise den Betrag auf unser Konto:\nEmpfänger: ${b.empfaenger || 'Made2Meant GmbH'}\nIBAN: ${b.iban}${b.bic ? '\nBIC: ' + b.bic : ''}\nBetrag: ${euro(order.total)}\nVerwendungszweck: ${shortId}`
          : `Betrag: ${euro(order.total)}, Verwendungszweck: ${shortId}. Unsere Bankdaten schicken wir dir in Kürze.`)
          + '\nSobald die Zahlung bei uns ist, beginnen wir mit deiner Bestellung.'
      } else {
        payBlock = `<p style="margin:0 0 24px;padding:12px 16px;background:#EAF1EA;border-radius:12px;color:#3F6B4C;font-size:14px">✓ Deine Zahlung ist bei uns eingegangen.</p>`
      }

      const mail = await sendMail({
        to: [order.email],
        subject: `Deine Bestellung ${shortId} bei made2meant`,
        text: `Danke${order.first_name ? ', ' + order.first_name : ''}!\n\nWir haben deine Bestellung ${shortId} erhalten und freuen uns, dein Lieblingsstück mit Sorgfalt in Österreich für dich zu besticken.\n\n${payText}\n\nDeine Bestellung:\n${itemsText}\n\n${totalsText}\n\nLieferadresse:\n${addressText}\n\nFragen zu deiner Bestellung? Antworte einfach auf diese E-Mail.\n\nMade2Meant GmbH, Franz-Broschek-Platz 5a, 2514 Möllersdorf, Österreich\n${site}`,
        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1c1c1c">
            <p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#7a6d64;margin:0 0 6px">Bestellbestätigung</p>
            <h1 style="font-size:24px;margin:0 0 10px;color:#2B120E">Danke${order.first_name ? ', ' + esc(order.first_name) : ''}!</h1>
            <p style="font-size:15px;line-height:1.6;color:#4a4540;margin:0 0 20px">
              Wir haben deine Bestellung <b>${shortId}</b> erhalten und freuen uns, dein Lieblingsstück
              mit Sorgfalt in Österreich für dich zu besticken.
            </p>
            ${payBlock}
            ${summaryTable}
            <h3 style="margin:26px 0 6px;font-size:15px">Lieferadresse</h3>
            <p style="margin:0;font-size:14px;line-height:1.6">${addressBlock}</p>
            ${order.tracking_link
              ? `<p style="margin:24px 0 0"><a href="${esc(order.tracking_link)}" style="background:#2B120E;color:#F2F1EC;padding:11px 20px;border-radius:999px;text-decoration:none;font-size:14px;display:inline-block">📦 Sendung verfolgen</a></p>`
              : ''}
            <p style="margin:18px 0 0;font-size:14px;line-height:1.6">
              <a href="${site}/order-success.html?id=${order.id}" style="color:#8a5a3b">Bestellung &amp; Lieferstatus ansehen →</a>
            </p>
            <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#4a4540">
              Fragen zu deiner Bestellung? Antworte einfach auf diese E-Mail.
            </p>
            <p style="margin:26px 0 0;font-size:11px;color:#a9a49c;line-height:1.6">
              Made2Meant GmbH · Franz-Broschek-Platz 5a · 2514 Möllersdorf · Österreich<br>
              <a href="${site}/agb.html" style="color:#a9a49c;text-decoration:none">AGB</a> ·
              <a href="${site}/datenschutz.html" style="color:#a9a49c;text-decoration:none">Datenschutz</a> ·
              <a href="${site}/impressum.html" style="color:#a9a49c;text-decoration:none">Impressum</a>
            </p>
          </div>`,
      })
      if (mail.ok) {
        await admin.from('orders').update({ customer_notified: true }).eq('id', order.id)
        result.customer = 'gesendet'
      } else result.customer = 'Fehler: ' + mail.detail
    }

    return json(result)
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500)
  }
})
