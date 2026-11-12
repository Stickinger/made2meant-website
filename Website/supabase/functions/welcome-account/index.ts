// ============================================================
// made2meant — Willkommens-Mail nach der Konto-Registrierung
// Deploy:  supabase functions deploy welcome-account   (MIT JWT-Prüfung)
// Secrets: RESEND_API_KEY, optional ORDER_FROM_EMAIL, SITE_URL, REPLY_TO_EMAIL
//
// Sicherheit: Die Mail geht ausschließlich an die E-Mail-Adresse des
// eingeloggten Kontos (aus dem Login-Token, nicht aus dem Request) und
// pro Konto nur ein einziges Mal (Merker in app_metadata.welcome_sent).
// Damit lässt sich die Funktion nicht zum Mail-Versand an Fremde missbrauchen.
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
    if (!token) return json({ error: 'Nicht eingeloggt' }, 401)
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: { user }, error } = await admin.auth.getUser(token)
    if (error || !user || !user.email || (user as any).is_anonymous) return json({ error: 'Nicht eingeloggt' }, 401)

    if (user.app_metadata?.welcome_sent) return json({ ok: true, already: true })
    // Nur für frisch angelegte Konten (48 h) – ältere Konten bekommen nachträglich keine Mail
    if (Date.now() - new Date(user.created_at).getTime() > 48 * 3600 * 1000) return json({ ok: true, skipped: 'alt' })

    // Merker zuerst setzen, damit auch bei gleichzeitigen Aufrufen nur eine Mail rausgeht
    await admin.auth.admin.updateUserById(user.id, { app_metadata: { ...(user.app_metadata || {}), welcome_sent: new Date().toISOString() } })

    const apiKey = Deno.env.get('RESEND_API_KEY')
    if (!apiKey) return json({ error: 'RESEND_API_KEY fehlt' }, 500)
    const site = (Deno.env.get('SITE_URL') || 'https://made2meant.com').replace(/\/$/, '')
    const first = String(user.user_metadata?.full_name || '').trim().split(/\s+/)[0] || ''
    const hello = first ? `Hallo ${esc(first)},` : 'Hallo,'
    const btn = (href: string, label: string) =>
      `<a href="${href}" style="display:inline-block;background:#2B120E;color:#F2F1EC;padding:13px 28px;border-radius:999px;text-decoration:none;font-size:15px;font-weight:bold">${label}</a>`
    const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1c1c1c;text-align:center">
      <h1 style="font-size:24px;margin:0 0 14px">Willkommen bei made2meant</h1>
      <p style="font-size:15px;line-height:1.6;color:#4d4842;margin:0 auto 14px;max-width:420px">${hello}<br>schön, dass du da bist! Dein Kundenkonto ist angelegt.</p>
      <p style="font-size:15px;line-height:1.6;color:#4d4842;margin:0 auto 24px;max-width:420px">
        In deinem Konto siehst du deine Bestellungen und kannst deine Adresse speichern – so geht die nächste Bestellung noch schneller.
        Jedes Stück besticken wir persönlich in unserer Werkstatt in Österreich.</p>
      ${btn(site + '/shop.html', 'Jetzt stöbern')}
      <p style="font-size:13px;line-height:1.6;color:#6b665f;margin:26px auto 0;max-width:420px">
        Zu deinem Konto: <a href="${site}/account.html" style="color:#2B120E">${site.replace(/^https?:\/\//, '')}/account.html</a><br>
        Fragen? Antworte einfach auf diese E-Mail.</p>
      <p style="font-size:11px;color:#a9a49c;margin-top:28px;line-height:1.6">
        Du erhältst diese einmalige E-Mail, weil mit dieser Adresse ein Kundenkonto bei made2meant angelegt wurde.
        Warst das nicht du? Dann antworte bitte kurz, wir löschen das Konto.<br>
        Made2Meant GmbH, Franz-Broschek-Platz 5a, 2514 Möllersdorf, Österreich</p></div>`
    const text = `Willkommen bei made2meant\n\n${first ? 'Hallo ' + first + ',' : 'Hallo,'}\nschön, dass du da bist! Dein Kundenkonto ist angelegt.\n\nIn deinem Konto siehst du deine Bestellungen und kannst deine Adresse speichern: ${site}/account.html\n\nZum Shop: ${site}/shop.html\n\nDu erhältst diese einmalige E-Mail, weil mit dieser Adresse ein Kundenkonto bei made2meant angelegt wurde. Warst das nicht du? Dann antworte bitte kurz, wir löschen das Konto.\n\nMade2Meant GmbH, Franz-Broschek-Platz 5a, 2514 Möllersdorf, Österreich`
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: Deno.env.get('ORDER_FROM_EMAIL') || 'made2meant <onboarding@resend.dev>',
        to: [user.email], subject: 'Willkommen bei made2meant', html, text,
        reply_to: Deno.env.get('REPLY_TO_EMAIL') || 'office@made2meant.com',
      }),
    })
    if (!res.ok) {
      // Versand fehlgeschlagen → Merker zurücknehmen, damit ein späterer Versuch möglich ist
      await admin.auth.admin.updateUserById(user.id, { app_metadata: { ...(user.app_metadata || {}), welcome_sent: null } })
      return json({ ok: false, detail: (await res.text()).slice(0, 300) }, 502)
    }
    return json({ ok: true, emailed: true })
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500)
  }
})
