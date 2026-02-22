export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 md:py-16">
      <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200 md:p-12">
        <p className="mb-4 inline-flex rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
          Bewerbungsplattform für Kandidaten & Unternehmen
        </p>
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight md:text-5xl">
          Moderne Recruiting-Plattform mit Profilaufbau, smartem Matching und direkter Ansprache.
        </h1>
        <p className="mt-5 max-w-3xl text-base text-zinc-600 md:text-lg">
          Arbeitssuchende erstellen vollständige Bewerbungsprofile inklusive Berufserfahrung,
          Ausbildung, Skills, Zertifikaten, Portfolio, Gehaltswunsch und Verfügbarkeit.
          Unternehmen suchen gezielt mit Filtern, speichern Favoriten, vergleichen Kandidaten und
          senden Kontaktanfragen direkt über die Plattform.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="/register"
            className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-700"
          >
            Jetzt starten
          </a>
          <a
            href="/login"
            className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
          >
            Zum Login
          </a>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: "Kandidaten-Profil",
            text: "Persönliche Daten, Erfahrung, Ausbildung, Skills, Zertifikate und Portfolio an einem Ort.",
          },
          {
            title: "Datenschutz & Sichtbarkeit",
            text: "Unternehmen/Geschäftsführer blockieren, aktuellen Arbeitgeber ausblenden, Sichtbarkeit steuern.",
          },
          {
            title: "Unternehmenssuche",
            text: "Erweiterte Filter für Qualifikationen, Standort, Gehalt, Verfügbarkeit und Erfahrung.",
          },
          {
            title: "Matching",
            text: "Regelbasiertes KI-ähnliches Scoring für Kandidatenvorschläge und passende Jobangebote.",
          },
        ].map((item) => (
          <article key={item.title} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
            <h2 className="text-lg font-semibold">{item.title}</h2>
            <p className="mt-2 text-sm text-zinc-600">{item.text}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
