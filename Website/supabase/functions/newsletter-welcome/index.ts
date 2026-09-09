// ============================================================
// made2meant — Newsletter-Anmeldung + Willkommens-Mail mit 10%-Code
// Deploy:  supabase functions deploy newsletter-welcome --no-verify-jwt
// Secrets: RESEND_API_KEY (schon gesetzt), optional ORDER_FROM_EMAIL
//
// Der Client (Popup + Footer-Formular) ruft diese Funktion mit der
// E-Mail auf. Sie trägt die Adresse ein und schickt EINMALIG eine
// Bestätigungs-Mail mit dem Gutscheincode. Der Code WILLKOMMEN10 muss
// im Admin unter Rabattcodes existieren (10 %).
//
// HINWEIS: Mails an Kunden-Adressen funktionieren erst, wenn die Domain
// made2meant.com bei Resend verifiziert ist. Vorher lehnt Resend den
// Versand an fremde Adressen ab (die Anmeldung klappt trotzdem).
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const WELCOME_CODE = 'WILLKOMMEN10'
const WELCOME_PCT = 10

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { email } = await req.json()
    const clean = String(email || '').trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return json({ error: 'Ungültige E-Mail' }, 400)

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // Bestehenden Abonnenten suchen
    const { data: existing } = await admin.from('newsletter_subscribers')
      .select('id, welcomed').eq('email', clean).maybeSingle()

    if (!existing) {
      await admin.from('newsletter_subscribers').insert({ email: clean, active: true, welcomed: false })
    } else if (existing.welcomed) {
      // Schon angemeldet und schon begrüßt -> keine zweite Mail
      return json({ subscribed: true, emailed: false, already: true })
    }

    // Willkommens-Mail senden
    const apiKey = Deno.env.get('RESEND_API_KEY')
    if (!apiKey) return json({ subscribed: true, emailed: false, reason: 'RESEND_API_KEY fehlt' })
    const from = Deno.env.get('ORDER_FROM_EMAIL') || 'made2meant <onboarding@resend.dev>'

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1c1c1c;text-align:center">
        <p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#c56a47;margin:0 0 6px">Willkommensgeschenk</p>
        <h1 style="font-size:26px;margin:0 0 10px">Willkommen bei made2meant 🤍</h1>
        <p style="font-size:15px;line-height:1.6;color:#6b665f;margin:0 auto 24px;max-width:380px">
          Schön, dass du dabei bist! Als kleines Dankeschön schenken wir dir
          <b>${WELCOME_PCT}% auf deine erste Bestellung</b>.
        </p>
        <div style="display:inline-block;border:2px dashed #c56a47;border-radius:10px;padding:14px 28px;margin-bottom:8px">
          <div style="font-size:12px;color:#8a8580;margin-bottom:2px">Dein Gutscheincode</div>
          <div style="font-size:24px;font-weight:bold;letter-spacing:2px;color:#c56a47">${WELCOME_CODE}</div>
        </div>
        <p style="font-size:13px;color:#8a8580;margin:6px 0 26px">Einfach an der Kasse eingeben.</p>
        <a href="https://made2meant.at" style="background:#c56a47;color:#fff;padding:12px 26px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:bold">Jetzt entdecken</a>
        <p style="font-size:11px;color:#a9a49c;margin-top:32px">
          Du erhältst diese E-Mail, weil du dich für den made2meant-Newsletter angemeldet hast.
        </p>
      </div>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [clean],
        subject: `Dein ${WELCOME_PCT}%-Gutschein für made2meant 🤍`,
        html,
      }),
    })

    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300)
      // Anmeldung ist trotzdem erfolgt — nur die Mail ging nicht raus.
      return json({ subscribed: true, emailed: false, reason: 'Resend-Fehler', detail })
    }

    await admin.from('newsletter_subscribers').update({ welcomed: true }).eq('email', clean)
    return json({ subscribed: true, emailed: true, code: WELCOME_CODE })
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500)
  }
})
