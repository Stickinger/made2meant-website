-- ============================================================
-- made2meant — Kategorie "Bundles" (Geschenksets aus Einzelprodukten)
-- Im Supabase SQL-Editor ausführen (einmalig).
--
-- Legt eine 6. Kategorie "Bundles" an, wie die 5 Anlass-Kategorien
-- (geburt/taufe/geburtstag/mama-papa/babyshower), aber ohne eigene
-- Kachel auf der Startseite.
--
-- SO LEGST DU EIN BUNDLE AN (im Admin unter Produkte):
--   1. Neues Produkt anlegen wie gewohnt (Name, Preis, Bild, Beschreibung).
--      Ein Bundle ist ein eigenes Produkt mit eigenem Preis — die
--      "Einzelprodukte" sind hier nur die Idee dahinter (z. B. Decke +
--      Kapuzenhandtuch + Lätzchen im Set), keine technische Verknüpfung.
--   2. Kategorie: "Bundles" auswählen.
--   3. Tags: den/die Anlass-Slug(s) eintragen, damit das Set auf der
--      passenden Anlass-Seite erscheint — z. B. "taufe" oder auch
--      "taufe, geburt" für mehrere Anlässe. Gültige Slugs:
--      geburt, taufe, geburtstag, mama-papa, babyshower
--
-- Ohne diesen Tag erscheint das Bundle nirgends automatisch (nur über
-- den normalen Shop-Filter), taucht aber weiterhin ganz normal im Shop
-- und auf der Startseite unter "Unsere Geschenk-Sets" auf.
-- ============================================================

INSERT INTO categories (name, slug, description, featured, active, sort_order)
VALUES (
  'Bundles',
  'bundles',
  'Geschenksets aus mehreren Einzelprodukten. Tipp: im Feld "Tags" den Anlass eintragen (z. B. taufe), damit das Set auf der passenden Anlass-Seite erscheint.',
  false,
  true,
  6
)
ON CONFLICT (slug) DO UPDATE
  SET description = EXCLUDED.description;
