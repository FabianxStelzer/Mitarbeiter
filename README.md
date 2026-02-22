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
