// ============================================================
// made2meant — Newsletter an alle bestätigten Abonnenten senden
// Deploy:  supabase functions deploy newsletter-broadcast
//          (OHNE --no-verify-jwt: nur eingeloggte Admins dürfen senden)
// Secrets: RESEND_API_KEY, ORDER_FROM_EMAIL, optional REPLY_TO_EMAIL, SITE_URL
//
// Body:   { subject, content, newsletter_id? }
//   content = HTML (darf {{name}} enthalten); wird pro Empfänger ersetzt
//   und mit Abmelde-Fuß + List-Unsubscribe-Header verschickt.
//
// Nur Empfänger mit confirmed = true UND active = true.
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { subject, content, newsletter_id } = await req.json()
    if (!subject || !content) return json({ error: 'subject und content sind nötig' }, 400)

    const url = Deno.env.get('SUPABASE_URL')!
    const service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const site = (Deno.env.get('SITE_URL') || 'https://made2meant.com').replace(/\/$/, '')

    // ── Admin-Prüfung ──
    const authHeader = req.headers.get('Authorization') || ''
    const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } })
    const { data: { user } } = await caller.auth.getUser()
    if (!user) return json({ error: 'Nicht eingeloggt' }, 401)
    const { data: adminRow } = await service.from('admins').select('user_id').eq('user_id', user.id).maybeSingle()
    if (!adminRow) return json({ error: 'Keine Admin-Berechtigung' }, 403)

    const apiKey = Deno.env.get('RESEND_API_KEY')
    if (!apiKey) return json({ error: 'RESEND_API_KEY ist nicht gesetzt' }, 500)
    const from = Deno.env.get('ORDER_FROM_EMAIL') || 'made2meant <onboarding@resend.dev>'
    const replyTo = Deno.env.get('REPLY_TO_EMAIL') || 'office@made2meant.com'

    // ── Empfänger: bestätigt UND aktiv ──
    const { data: subs, error: subErr } = await service.from('newsletter_subscribers')
      .select('email, name, confirm_token, confirmed, active')
      .eq('active', true).eq('confirmed', true)
    if (subErr) return json({ error: subErr.message }, 500)
    const recipients = (subs || []).filter((s: any) => s.email)
    if (!recipients.length) return json({ error: 'Keine bestätigten Abonnenten vorhanden' }, 400)

    const frame = (inner: string, unsubscribeUrl: string) => `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1c1c1c">
        <h1 style="color:#2B120E;font-size:22px;margin:0 0 16px">made2meant</h1>
        <div style="font-size:15px;line-height:1.7;color:#2a2724">${inner}</div>
        <p style="margin:30px 0 0;font-size:11px;color:#a9a49c;line-height:1.6">
          Du erhältst diese E-Mail, weil du den made2meant-Newsletter abonniert hast.<br>
          <a href="${unsubscribeUrl}" style="color:#a9a49c">Newsletter abbestellen</a> ·
          Made2Meant GmbH · Franz-Broschek-Platz 5a · 2514 Möllersdorf · Österreich
        </p>
      </div>`

    // Resend-Batch (max 100 pro Call)
    const chunks: any[][] = []
    for (let i = 0; i < recipients.length; i += 100) chunks.push(recipients.slice(i, i + 100))

    let sent = 0, failed = 0
    const errors: string[] = []
    for (const chunk of chunks) {
      const batch = chunk.map((s: any) => {
        const unsub = `${site}/newsletter.html?abmelden=${s.confirm_token}`
        const name = (s.name && String(s.name).trim()) || 'du'
        const html = frame(String(content).replaceAll('{{name}}', esc(name)), unsub)
        return {
          from, to: [s.email], reply_to: replyTo, subject: String(subject),
          html, headers: { 'List-Unsubscribe': `<${unsub}>` },
        }
      })
      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      })
      if (res.ok) { sent += chunk.length }
      else { failed += chunk.length; errors.push((await res.text()).slice(0, 200)) }
    }

    // Newsletter-Datensatz als gesendet markieren
    if (newsletter_id) {
      await service.from('newsletters').update({
        status: 'sent', sent_at: new Date().toISOString(), recipient_count: sent,
      }).eq('id', newsletter_id)
    }

    return json({ ok: failed === 0, sent, failed, ...(errors.length ? { detail: errors[0] } : {}) })
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500)
  }
})
