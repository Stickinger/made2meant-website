// ============================================================
// made2meant — Newsletter mit Double-Opt-in
// Deploy:  supabase functions deploy newsletter-welcome --no-verify-jwt
// Secrets: RESEND_API_KEY (schon gesetzt), optional ORDER_FROM_EMAIL,
//          optional SITE_URL (Standard: https://made2meant.com)
// Vorher:  datenschutz-setup.sql ausführen (neue Spalten).
//
// Aktionen (POST-Body):
//   { action: 'subscribe', email }  → Eintrag (unbestätigt) + Bestätigungsmail
//   { action: 'confirm', token }    → bestätigt; beim ersten Mal Willkommensmail
//                                     mit dem Code WILLKOMMEN10
//   { action: 'unsubscribe', token} → abgemeldet
// Ohne action wird 'subscribe' angenommen (ältere Seitenversionen).
//
// Nachweis der Einwilligung: Zeitpunkt + IP von Anmeldung und Bestätigung.
// Der Gutscheincode wird pro E-Mail-Adresse nur einmal verschickt.
//
// HINWEIS: Mails an Kunden-Adressen funktionieren erst, wenn die Domain
// made2meant.com bei Resend verifiziert ist.
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const WELCOME_CODE = 'WILLKOMMEN10'
const WELCOME_PCT = 10
const RESEND_COOLDOWN_MS = 5 * 60 * 1000 // Bestätigungsmail höchstens alle 5 Min. erneut

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}
function clientIp(req: Request) {
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || null
}
const isUuid = (s: unknown) => typeof s === 'string' && /^[0-9a-f-]{36}$/i.test(s)

async function sendMail(to: string, subject: string, html: string, text: string, unsubscribeUrl?: string) {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) return { ok: false, detail: 'RESEND_API_KEY fehlt' }
  const from = Deno.env.get('ORDER_FROM_EMAIL') || 'made2meant <onboarding@resend.dev>'
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from, to: [to], subject, html, text,
      reply_to: Deno.env.get('REPLY_TO_EMAIL') || 'office@made2meant.com',
      ...(unsubscribeUrl ? { headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>` } } : {}),
    }),
  })
  return { ok: res.ok, detail: res.ok ? '' : (await res.text()).slice(0, 300) }
}

function frame(inner: string) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1c1c1c;text-align:center">${inner}</div>`
}
const button = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:#2B120E;color:#F2F1EC;padding:13px 28px;border-radius:999px;text-decoration:none;font-size:15px;font-weight:bold">${label}</a>`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const body = await req.json()
    const action = body.action || 'subscribe'
    const site = (Deno.env.get('SITE_URL') || 'https://made2meant.com').replace(/\/$/, '')
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const now = new Date().toISOString()
    const ip = clientIp(req)

    // ── ANMELDEN ────────────────────────────────────────────
    if (action === 'subscribe') {
      const email = String(body.email || '').trim().toLowerCase()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Ungültige E-Mail' }, 400)

      const { data: existing } = await admin.from('newsletter_subscribers')
        .select('id, confirmed, active, consent_at, confirm_token').eq('email', email).maybeSingle()

      // Schon bestätigt und aktiv → nichts tun (keine neue Mail)
      if (existing?.confirmed && existing?.active) return json({ ok: true, already: true })

      // Gegen Mail-Spam: dieselbe Adresse nicht im Minutentakt anschreiben
      if (existing?.consent_at && Date.now() - new Date(existing.consent_at).getTime() < RESEND_COOLDOWN_MS) {
        return json({ ok: true, pending: true })
      }

      const token = crypto.randomUUID()
      const row = { confirmed: false, active: false, confirm_token: token, consent_at: now, consent_ip: ip, unsubscribed_at: null }
      const { error } = existing
        ? await admin.from('newsletter_subscribers').update(row).eq('id', existing.id)
        : await admin.from('newsletter_subscribers').insert({ email, welcomed: false, ...row })
      if (error) return json({ error: error.message }, 500)

      const confirmUrl = `${site}/newsletter.html?bestaetigen=${token}`
      const mail = await sendMail(email, 'Bitte bestätige deine Anmeldung bei made2meant', frame(`
        <h1 style="font-size:24px;margin:0 0 12px">Fast geschafft!</h1>
        <p style="font-size:15px;line-height:1.6;color:#6b665f;margin:0 auto 26px;max-width:400px">
          Bitte bestätige mit einem Klick, dass du den made2meant-Newsletter erhalten möchtest.
          Danach schicken wir dir deinen Willkommensgutschein.
        </p>
        ${button(confirmUrl, 'Anmeldung bestätigen')}
        <p style="font-size:12px;color:#a9a49c;margin-top:30px;line-height:1.6">
          Du hast dich nicht angemeldet? Dann ignoriere diese E-Mail einfach – ohne Bestätigung
          erhältst du keine weiteren Nachrichten von uns.
        </p>`),
        `Fast geschafft!\n\nBitte bestätige, dass du den made2meant-Newsletter erhalten möchtest:\n${confirmUrl}\n\nDanach schicken wir dir deinen Willkommensgutschein.\n\nDu hast dich nicht angemeldet? Dann ignoriere diese E-Mail einfach.\n\nMade2Meant GmbH, Franz-Broschek-Platz 5a, 2514 Möllersdorf, Österreich`)
      return json({ ok: true, emailed: mail.ok, ...(mail.ok ? {} : { detail: mail.detail }) })
    }

    // Ab hier: Aktionen per Link-Token
    if (!isUuid(body.token)) return json({ error: 'Ungültiger Link' }, 400)
    const { data: sub } = await admin.from('newsletter_subscribers')
      .select('id, email, confirmed, active, welcomed, confirm_token').eq('confirm_token', body.token).maybeSingle()
    if (!sub) return json({ error: 'Link ungültig oder abgelaufen' }, 404)
    const unsubscribeUrl = `${site}/newsletter.html?abmelden=${sub.confirm_token}`

    // ── BESTÄTIGEN ──────────────────────────────────────────
    if (action === 'confirm') {
      if (!(sub.confirmed && sub.active)) {
        await admin.from('newsletter_subscribers').update({
          confirmed: true, active: true, confirmed_at: now, confirm_ip: ip, unsubscribed_at: null,
        }).eq('id', sub.id)
      }

      // Gutschein nur einmal pro Adresse
      if (!sub.welcomed) {
        const mail = await sendMail(sub.email, `Dein ${WELCOME_PCT}%-Gutschein für made2meant`, frame(`
          <p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#7a6d64;margin:0 0 6px">Willkommensgeschenk</p>
          <h1 style="font-size:26px;margin:0 0 10px">Willkommen bei made2meant 🤍</h1>
          <p style="font-size:15px;line-height:1.6;color:#6b665f;margin:0 auto 24px;max-width:380px">
            Schön, dass du dabei bist! Als kleines Dankeschön schenken wir dir
            <b>${WELCOME_PCT}% auf deine erste Bestellung</b>.
          </p>
          <div style="display:inline-block;border:2px dashed #2B120E;border-radius:10px;padding:14px 28px;margin-bottom:8px">
            <div style="font-size:12px;color:#8a8580;margin-bottom:2px">Dein Gutscheincode</div>
            <div style="font-size:24px;font-weight:bold;letter-spacing:2px;color:#2B120E">${WELCOME_CODE}</div>
          </div>
          <p style="font-size:13px;color:#8a8580;margin:6px 0 26px">Einfach an der Kasse eingeben.</p>
          ${button(site, 'Jetzt entdecken')}
          <p style="font-size:11px;color:#a9a49c;margin-top:32px;line-height:1.6">
            Du erhältst diese E-Mail, weil du dich für den made2meant-Newsletter angemeldet hast.<br>
            <a href="${unsubscribeUrl}" style="color:#a9a49c">Newsletter abbestellen</a>
          </p>`),
          `Willkommen bei made2meant!\n\nAls Dankeschön schenken wir dir ${WELCOME_PCT}% auf deine erste Bestellung.\nDein Gutscheincode: ${WELCOME_CODE}\nEinfach an der Kasse eingeben: ${site}\n\nNewsletter abbestellen: ${unsubscribeUrl}\n\nMade2Meant GmbH, Franz-Broschek-Platz 5a, 2514 Möllersdorf, Österreich`,
          unsubscribeUrl)
        if (mail.ok) await admin.from('newsletter_subscribers').update({ welcomed: true }).eq('id', sub.id)
      }
      return json({ ok: true, confirmed: true, code: WELCOME_CODE })
    }

    // ── ABMELDEN ────────────────────────────────────────────
    if (action === 'unsubscribe') {
      await admin.from('newsletter_subscribers').update({ active: false, unsubscribed_at: now }).eq('id', sub.id)
      return json({ ok: true, unsubscribed: true })
    }

    return json({ error: 'Unbekannte Aktion' }, 400)
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500)
  }
})
