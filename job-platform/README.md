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
- Matching zu Jobpostings inkl. Score
- Verwaltung eingehender Kontaktanfragen

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
- Kontaktanfragen direkt über die Plattform
- Jobposting-Verwaltung
- Matching-Vorschläge für Kandidaten

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

App öffnen: `http://localhost:3000`

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
