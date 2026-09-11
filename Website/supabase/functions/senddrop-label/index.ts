// ============================================================
// made2meant — Senddrop Versandlabel erstellen
// Deploy:  supabase functions deploy senddrop-label
//          (OHNE --no-verify-jwt, damit nur eingeloggte Nutzer aufrufen können)
// Secret:  supabase secrets set SENDDROP_API_TOKEN=xxxxxxxx
//
// Ablauf laut Senddrop-API:
//   1) POST /api/v1/shipments            → Sendung anlegen (liefert ShipmentDto.id)
//   2) POST /api/v1/shipments/{id}/label → Label erzeugen
//   3) GET  /api/v1/shipments/{id}       → Tracking (carrierTrackingId, trackingLink)
//   4) GET  /api/v1/shipments/{id}/pdf   → Label als PDF (Base64 an den Admin)
//
// Nur Admins (Tabelle admins) dürfen die Funktion auslösen.
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const SD_BASE = 'https://api.senddrop.com'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}
function toBase64(bytes: Uint8Array) {
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  return btoa(bin)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { order_id, carrierType, weightGrams, phone } = await req.json()
    if (!order_id || !carrierType) return json({ error: 'order_id und carrierType sind nötig' }, 400)

    const url = Deno.env.get('SUPABASE_URL')!
    const service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // ── Admin-Prüfung (nur Admins dürfen Labels erstellen) ──
    const authHeader = req.headers.get('Authorization') || ''
    const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } })
    const { data: { user } } = await caller.auth.getUser()
    if (!user) return json({ error: 'Nicht eingeloggt' }, 401)
    const { data: adminRow } = await service.from('admins').select('user_id').eq('user_id', user.id).maybeSingle()
    if (!adminRow) return json({ error: 'Keine Admin-Berechtigung' }, 403)

    const token = Deno.env.get('SENDDROP_API_TOKEN')
    if (!token) return json({ error: 'SENDDROP_API_TOKEN ist nicht gesetzt (Secret in Supabase hinterlegen).' }, 500)

    // ── Bestellung laden ──
    const { data: order, error } = await service.from('orders').select('*').eq('id', order_id).single()
    if (error || !order) return json({ error: 'Bestellung nicht gefunden' }, 404)

    // Straße & Hausnummer trennen (Bestellung speichert beides in einem Feld)
    const addr = String(order.address || '').trim()
    const m = addr.match(/^(.*?)[\s,]+(\d+\s*[a-zA-Z]?(?:[\/-]\d+\w*)?)$/)
    const street = m ? m[1].trim() : addr
    const houseNumber = m ? m[2].replace(/\s+/g, '') : ''

    const weight = Number(weightGrams) > 0 ? Math.round(Number(weightGrams)) : 500

    const sdHeaders = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', 'Accept': 'application/json' }

    // 1) Sendung anlegen
    const createRes = await fetch(SD_BASE + '/api/v1/shipments', {
      method: 'POST', headers: sdHeaders,
      body: JSON.stringify({
        carrierType,
        totalWeight: weight,
        recipientName: [order.first_name, order.last_name].filter(Boolean).join(' ') || undefined,
        recipientEmail: order.email || undefined,
        recipientPhoneNumber: (phone && String(phone).trim()) || undefined,
        reference: '#' + String(order.id).slice(0, 8).toUpperCase(),
        recipientAddress: {
          firstName: order.first_name || undefined,
          lastName: order.last_name || undefined,
          street: street || undefined,
          houseNumber: houseNumber || undefined,
          postalCode: order.zip || undefined,
          city: order.city || undefined,
          country: order.country || 'AT',
        },
      }),
    })
    const createText = await createRes.text()
    if (!createRes.ok) return json({ error: 'Senddrop: Sendung anlegen fehlgeschlagen', status: createRes.status, detail: createText.slice(0, 700) }, 502)
    let shipment: any
    try { shipment = JSON.parse(createText) } catch { return json({ error: 'Senddrop: unerwartete Antwort beim Anlegen', detail: createText.slice(0, 300) }, 502) }
    const shipmentId = shipment?.id
    if (!shipmentId) return json({ error: 'Senddrop: keine Sendungs-ID erhalten', detail: JSON.stringify(shipment).slice(0, 300) }, 502)

    // 2) Label erzeugen
    const labelRes = await fetch(`${SD_BASE}/api/v1/shipments/${shipmentId}/label`, { method: 'POST', headers: sdHeaders })
    if (!labelRes.ok) {
      const t = await labelRes.text()
      return json({ error: 'Senddrop: Label erstellen fehlgeschlagen', status: labelRes.status, detail: t.slice(0, 700), shipmentId }, 502)
    }

    // 3) Tracking nachladen
    let tracking: string | null = null, trackingLink: string | null = null
    try {
      const detRes = await fetch(`${SD_BASE}/api/v1/shipments/${shipmentId}`, { headers: sdHeaders })
      if (detRes.ok) { const det = await detRes.json(); tracking = det?.carrierTrackingId ?? null; trackingLink = det?.trackingLink ?? null }
    } catch (_) { /* Tracking optional */ }

    // 4) Label-PDF holen (Base64 an den Admin)
    let pdfBase64: string | null = null
    try {
      const pdfRes = await fetch(`${SD_BASE}/api/v1/shipments/${shipmentId}/pdf`, { headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/pdf' } })
      if (pdfRes.ok) pdfBase64 = toBase64(new Uint8Array(await pdfRes.arrayBuffer()))
    } catch (_) { /* PDF ggf. später über Tracking-Link */ }

    // In Bestellung speichern
    await service.from('orders').update({
      senddrop_shipment_id: shipmentId,
      tracking_number: tracking,
      tracking_link: trackingLink,
      shipping_carrier: carrierType,
      label_created_at: new Date().toISOString(),
    }).eq('id', order_id)

    return json({ ok: true, shipmentId, tracking, trackingLink, pdfBase64 })
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500)
  }
})
