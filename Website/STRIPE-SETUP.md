# Stripe einrichten — Schritt für Schritt

Der Checkout bietet **Karte/Klarna/Apple Pay (Stripe)** und **Überweisung (Vorkasse)**.
Vorkasse funktioniert sofort. Für die Stripe-Zahlung sind einmalig diese Schritte nötig.

Du brauchst dafür einmal das **Supabase CLI** auf deinem Mac. Falls du unsicher bist,
sag mir Bescheid — ich führe dich Befehl für Befehl durch.

---

## 1. Datenbank vorbereiten
Im **Supabase → SQL Editor** die Datei `stripe-setup.sql` ausführen
(fügt der Bestellung ein Feld für die Stripe-Zahlung hinzu).

## 2. Stripe-Schlüssel holen
Im **Stripe-Dashboard → Entwickler → API-Schlüssel**:
- **Geheimer Schlüssel** (beginnt mit `sk_live_…` bzw. zum Testen `sk_test_…`)

## 3. Supabase CLI installieren & einloggen
```bash
brew install supabase/tap/supabase
supabase login
supabase link --project-ref DEIN_PROJECT_REF
```
(Den `project-ref` findest du in Supabase → Project Settings → General.)

## 4. Geheimen Schlüssel als Secret setzen
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_DEIN_SCHLUESSEL
```

## 5. Funktionen deployen
```bash
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook --no-verify-jwt
```
> Das `--no-verify-jwt` beim Webhook ist wichtig — Stripe ruft ihn ohne Login auf.

## 6. Webhook in Stripe anlegen
Im **Stripe-Dashboard → Entwickler → Webhooks → Endpoint hinzufügen**:
- URL:
  ```
  https://DEIN_PROJECT_REF.supabase.co/functions/v1/stripe-webhook
  ```
- Event auswählen: **`checkout.session.completed`**
- Speichern → Stripe zeigt dir das **Signing secret** (`whsec_…`)

Dann dieses Secret setzen:
```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_DEIN_SECRET
```

## Fertig ✅
Ab jetzt: Kunde wählt „Karte/Klarna", wird zu Stripe geleitet, zahlt, und die
Bestellung wird automatisch auf **„In Bearbeitung"** (= bezahlt) gesetzt.

---

### Gut zu wissen
- Zum **Testen** zuerst `sk_test_…` verwenden und in Stripe den Testmodus lassen;
  Testkarte: `4242 4242 4242 4242`, beliebiges künftiges Datum, beliebiger CVC.
- **Preis-Sicherheit:** Die Zahlbeträge werden serverseitig aus der Datenbank
  gelesen (nicht aus dem Browser). Die Artikelpreise selbst entstehen aber beim
  Konfigurieren im Browser — für maximale Sicherheit sollten wir später die
  Personalisierungs-Preise auch serverseitig nachrechnen. Sag Bescheid, wenn du
  das absichern willst.
