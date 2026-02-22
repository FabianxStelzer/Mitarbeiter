"use client";

import { useEffect } from "react";

type GlobalErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalErrorPage({ error, reset }: GlobalErrorPageProps) {
  useEffect(() => {
    console.error("Globaler App-Fehler:", error);
  }, [error]);

  return (
    <html lang="de">
      <body className="bg-zinc-50 text-zinc-900 antialiased">
        <main className="mx-auto w-full max-w-3xl px-4 py-12">
          <section className="rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
            <p className="inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700">
              Kritischer Fehler
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">
              Die Anwendung konnte nicht korrekt geladen werden.
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              Bitte versuche es erneut. Falls der Fehler bleibt, starte den Dev-Server neu.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-5 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
            >
              Erneut versuchen
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
