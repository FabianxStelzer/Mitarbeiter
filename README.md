# Mitarbeiter-Plattform

Die implementierte Webplattform befindet sich im Unterordner:

- **`job-platform/`**

## Start

```bash
cd job-platform
npm install
cp .env.example .env
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Danach: `http://localhost:8080`

Mehr Details siehe `job-platform/README.md`.

## Alternative (direkt im Repository-Root)

Falls du bereits im Root arbeitest, funktionieren dieselben Kommandos jetzt auch dort:

```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Die Skripte leiten intern an `job-platform/` weiter und vermeiden typische 404-Fehler durch Start im falschen Ordner.
