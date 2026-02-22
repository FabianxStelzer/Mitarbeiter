# Bewerbungsplattform

Moderne Webplattform für:

- **Kandidaten**: vollständiges Bewerbungsprofil, Sichtbarkeit/Privatsphäre, Portfolio, Matching und Kontaktanfragen
- **Unternehmen**: verifizierbares Profil, Kandidatensuche mit Filtern, Favoritenliste, Kandidatenvergleich, Kontaktanfragen, Jobverwaltung

## Tech-Stack

- **Next.js 16** (App Router), TypeScript, Tailwind CSS
- **Prisma + SQLite** (einfach auf PostgreSQL erweiterbar)
- **NextAuth (Credentials)** mit rollenbasierten Rechten
- API-first Struktur über Route Handler (`/api/private/...`)

## Kernfunktionen

### Kandidaten

- Selbstregistrierung & Login
- Bewerbungsprofil mit:
  - persönlichen Daten
  - Berufserfahrung
  - Ausbildung
  - Fähigkeiten
  - Zertifikaten
  - Portfolio (inkl. Dateiupload)
  - Profilbild (Bild-Upload)
  - Gehaltsvorstellungen
  - Verfügbarkeit
- Privatsphäre:
  - bestimmte Unternehmen blockieren
  - einzelne Geschäftsführer (E-Mail) blockieren
  - aktueller Arbeitgeber darf Profil nicht sehen
- Sichtbarkeitsstatus:
  - aktiv suchend
  - offen für Angebote
  - unsichtbar
- Übersicht aller aktuell offenen Stellen von Unternehmen
- Bewerbungs-Board (Beworben, Eingeladen, Interviews, Eingestellt, Abgelehnt)
- Nachrichten direkt in der Plattform (kein Austausch von E-Mail/Telefon nötig)

### Unternehmen

- Unternehmensaccount inkl. Verifizierungsanfrage
- Kandidatensuche mit Filtern:
  - Skills
  - Standort
  - Berufserfahrung
  - Gehaltsrahmen
  - Verfügbarkeit
  - Freitext
- Favoritenliste
- Kandidatenvergleich
- Nachrichten direkt über die Plattform
- Jobposting-Verwaltung
- Matching-Vorschläge für Kandidaten
- Bewerbungs-Kanban mit Drag-and-drop:
  - Beworben
  - Eingeladen
  - Interviews
  - Eingestellt
  - Abgelehnt

### DSGVO & Sicherheit

- gehashte Passwörter (`bcrypt`)
- rollenbasierte Zugriffskontrolle
- Datenexport (`/api/private/account/export`)
- Kontolöschung (`/api/private/account/delete`)

## Schnellstart

```bash
npm install
cp .env.example .env
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

App öffnen: `http://localhost:8080`

> Hinweis: Falls bereits eine `.env` existiert, setze `NEXTAUTH_URL` auf `http://localhost:8080`.

### Demo-Logins (nach Seed)

- Kandidat: `kandidat@demo.de` / `Kandidat123!`
- Unternehmen: `hr@demo-gmbh.de` / `Unternehmen123!`

## Wichtige Skripte

- `npm run dev` – Entwicklungsserver
- `npm run build` – Produktionsbuild
- `npm run lint` – Linting
- `npm run db:push` – Prisma-Schema anwenden
- `npm run db:seed` – Demodaten einspielen
- `npm run db:studio` – Prisma Studio

## Fehlerbehebung

Falls im Browser die Meldung **`missing required error components, refreshing...`** erscheint:

1. Dev-Server stoppen
2. Build-Cache löschen: `rm -rf .next`
3. Server neu starten: `npm run dev`

Wenn Änderungen nicht sichtbar sind:

1. Sicherstellen, dass der neueste Stand gezogen wurde: `git pull`
2. „Frischen“ Start nutzen: `npm run dev:fresh`
3. Version prüfen: `http://localhost:8080/api/version`

Die JSON-Antwort muss den aktuellen Commit zeigen (z. B. `131cc0e` oder neuer).

Falls im Terminal `EADDRINUSE: address already in use :::8080` erscheint:

- `npm run dev:fresh` nutzen (beendet alte Next-Prozesse und startet sauber neu).

Wenn weiterhin Probleme auftreten:

```bash
npm run doctor
```

und die Ausgabe teilen.
