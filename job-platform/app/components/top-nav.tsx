import Link from "next/link";
import { UserRole } from "@prisma/client";
import { getServerAuthSession } from "@/lib/auth";
import { SignOutButton } from "@/app/components/sign-out-button";

export async function TopNav() {
  const session = await getServerAuthSession();

  return (
    <header className="border-b border-zinc-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-base font-semibold tracking-tight text-zinc-900">
          Bewerbungsplattform
        </Link>
        <nav className="flex items-center gap-2">
          {session ? (
            <>
              <Link
                href={
                  session.user.role === UserRole.CANDIDATE
                    ? "/dashboard/candidate"
                    : "/dashboard/company"
                }
                className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
              >
                Dashboard
              </Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
              >
                Registrieren
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
