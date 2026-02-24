import type { NextPageContext } from "next";
import Link from "next/link";

type ErrorPageProps = {
  statusCode: number;
};

function ErrorPage({ statusCode }: ErrorPageProps) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <section className="rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
        <p className="inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700">
          Fehler {statusCode}
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          Unerwarteter Fehler
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Beim Laden ist ein Fehler aufgetreten.
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

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res?.statusCode ?? err?.statusCode ?? 500;
  return { statusCode };
};

export default ErrorPage;
