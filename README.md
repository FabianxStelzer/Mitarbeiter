# Mitarbeiter-Plattform

Moderne Webplattform für Arbeitssuchende und Unternehmen: Bewerbungsprofile erstellen, Kandidatensuche mit Filtern, Matching und Kontaktanfragen.

## Features

### Kandidaten
- **Selbstregistrierung & Profil**: Persönliche Daten, Berufserfahrung, Ausbildung, Fähigkeiten, Zertifikate, Portfolio, Gehaltswunsch, Verfügbarkeit
- **Sichtbarkeit**: Aktiv suchend / Offen für Angebote / Unsichtbar
- **Privatsphäre**: Aktuellen Arbeitgeber ausblenden, Unternehmen blockieren, einzelne Personen (E-Mail) blockieren

### Unternehmen
- **Unternehmensaccount** mit optionaler Verifizierung
- **Kandidatensuche** mit Filtern: Skills, Standort, Gehaltsrahmen, Verfügbarkeit, Jahre Erfahrung
- **Favoritenliste** und **Kontaktanfragen** direkt über die Plattform
- **Matching-Score** je Suchergebnis

### Technik
- Next.js 14 (App Router), TypeScript, Tailwind CSS
- NextAuth (Credentials), Prisma (SQLite/PostgreSQL-fähig)
- Rollenbasierte Zugriffe, DSGVO-orientierte Struktur
- API-fähig für spätere Integrationen

## Schnellstart

```bash
npm install
cp .env.example .env
# Optional: NEXTAUTH_SECRET setzen (z. B. openssl rand -base64 32)
npx prisma generate
npx prisma db push
npm run dev
```

Öffnen: **http://localhost:8080**

- **Registrieren** als Kandidat oder Unternehmen
- Kandidat: **Dashboard** → Profil anlegen/bearbeiten, Sichtbarkeit & Privatsphäre einstellen
- Unternehmen: **Kandidatensuche** mit Filtern, Favoriten, Kontaktanfragen

## Skripte

| Befehl        | Beschreibung              |
|---------------|---------------------------|
| `npm run dev` | Entwicklungsserver        |
| `npm run build` | Produktionsbuild         |
| `npm run start` | Server starten           |
| `npm run db:studio` | Prisma Studio (DB-GUI) |
| `npm run db:push` | Schema in DB anwenden   |

## Umgebung

- `DATABASE_URL`: Prisma DB (z. B. `file:./dev.db` oder PostgreSQL-URL)
- `NEXTAUTH_SECRET`: Geheimnis für JWT (Produktion zwingend setzen)
- `NEXTAUTH_URL`: Basis-URL der App (z. B. `http://localhost:8080`)

## Wenn localhost:8080 nicht lädt

1. **Server muss laufen** – im Projektordner im Terminal: `npm run dev` (oder `npm run build && npm run start` für Produktionsmodus).
2. **Cache leeren** – bei 404 oder fehlerhafter Anzeige: `rm -rf .next` ausführen, danach erneut `npm run dev`.
3. **Produktionsmodus testen** – oft stabiler als Dev: `npm run build` dann `npm run start`, danach http://localhost:8080 öffnen.
4. **macOS „too many open files“** – wenn der Dev-Server mit EMFILE-Fehlern abbricht, im Terminal einmal `ulimit -n 10240` setzen und danach `npm run dev` erneut starten.

## Optionale Erweiterungen (nicht implementiert)

- KI-Matching-Score und Profilbewertung
- Automatischer Lebenslauf-Generator
- Statistik-Dashboard für Unternehmen
- Datei-Upload für Portfolio (derzeit nur URLs)
# Mitarbeiter
