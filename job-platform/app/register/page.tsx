"use client";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const USER_ROLE = {
  CANDIDATE: "CANDIDATE",
  COMPANY: "COMPANY",
} as const;

type UserRoleValue = (typeof USER_ROLE)[keyof typeof USER_ROLE];

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<UserRoleValue>(USER_ROLE.CANDIDATE);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [gdprConsent, setGdprConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role,
        email,
        password,
        firstName,
        lastName,
        companyName,
        gdprConsent,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data?.error ?? "Registrierung fehlgeschlagen.");
      setIsLoading(false);
      return;
    }

    const loginResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/dashboard",
    });

    setIsLoading(false);
    if (loginResult?.error) {
      router.push("/login");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-6xl items-center px-4 py-10">
      <section className="mx-auto w-full max-w-2xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 md:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Registrierung</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Erstelle dein Konto als Kandidat oder Unternehmen.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <span className="mb-2 block text-sm font-medium">Ich bin ...</span>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setRole(USER_ROLE.CANDIDATE)}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                  role === USER_ROLE.CANDIDATE
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100"
                }`}
              >
                Kandidat
              </button>
              <button
                type="button"
                onClick={() => setRole(USER_ROLE.COMPANY)}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                  role === USER_ROLE.COMPANY
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100"
                }`}
              >
                Unternehmen
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {role === USER_ROLE.CANDIDATE ? (
              <>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium">Vorname</span>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none ring-zinc-900/20 transition focus:ring-4"
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium">Nachname</span>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none ring-zinc-900/20 transition focus:ring-4"
                    required
                  />
                </label>
              </>
            ) : (
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm font-medium">Unternehmensname</span>
                <input
                  type="text"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none ring-zinc-900/20 transition focus:ring-4"
                  required
                />
              </label>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">E-Mail</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none ring-zinc-900/20 transition focus:ring-4"
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Passwort</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none ring-zinc-900/20 transition focus:ring-4"
                minLength={8}
                required
              />
            </label>
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3">
            <input
              type="checkbox"
              checked={gdprConsent}
              onChange={(event) => setGdprConsent(event.target.checked)}
              className="mt-0.5"
              required
            />
            <span className="text-sm text-zinc-700">
              Ich stimme der DSGVO-konformen Verarbeitung meiner Daten zur Vermittlung und
              Kontaktaufnahme zu.
            </span>
          </label>

          {error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-60"
          >
            {isLoading ? "Registrierung läuft..." : "Konto erstellen"}
          </button>
        </form>

        <p className="mt-5 text-sm text-zinc-600">
          Bereits registriert?{" "}
          <Link href="/login" className="font-medium text-zinc-900 underline">
            Zum Login
          </Link>
        </p>
      </section>
    </main>
  );
}
