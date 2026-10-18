// ============================================================
// made2meant — automatische Produkt-Sitemap für Google
// Liefert alle aktiven Produkte als TEXT-Sitemap (eine URL pro Zeile,
// von Google offiziell unterstützt). Text statt XML, weil Supabase
// Function-Antworten immer als text/plain ausliefert.
// Erreichbar über https://made2meant.com/sitemap-produkte.txt
// (Netlify leitet per _redirects hierher weiter; robots.txt verweist darauf).
// Deploy:  supabase functions deploy sitemap-products --no-verify-jwt
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const SITE = 'https://made2meant.com'

Deno.serve(async () => {
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!)
  const { data, error } = await db.from('products')
    .select('slug').eq('active', true).order('created_at', { ascending: false })
  if (error) return new Response('Fehler: ' + error.message, { status: 500 })

  const lines = (data || []).filter((p: any) => p.slug)
    .map((p: any) => `${SITE}/product.html?slug=${encodeURIComponent(p.slug)}`)
  return new Response(lines.join('\n') + '\n', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  })
})
