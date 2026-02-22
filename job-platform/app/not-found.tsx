import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="inline-flex rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
          404
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          Seite nicht gefunden
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Die angeforderte Seite existiert nicht oder wurde verschoben.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
        >
          Zur Startseite
        </Link>
      </section>
    </main>
  );
}
