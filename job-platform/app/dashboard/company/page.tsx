"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";

type ContactStatusValue = "PENDING" | "ACCEPTED" | "DECLINED";

const VERIFICATION_STATUS = {
  UNVERIFIED: "UNVERIFIED",
  PENDING: "PENDING",
  VERIFIED: "VERIFIED",
} as const;

type VerificationStatusValue = (typeof VERIFICATION_STATUS)[keyof typeof VERIFICATION_STATUS];

type CompanyProfile = {
  id: string;
  companyName: string;
  legalName: string | null;
  location: string | null;
  industry: string | null;
  website: string | null;
  description: string | null;
  verificationStatus: VerificationStatusValue;
  managingDirectorEmail: string | null;
  employeeCount: number | null;
};

type JobPosting = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  isRemote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  minExperienceYears: number;
  requiredSkills: string[];
  preferredSkills: string[];
  availabilityNote: string | null;
  active: boolean;
};

type CandidateSearchResult = {
  id: string;
  firstName: string;
  lastName: string;
  location: string | null;
  headline: string | null;
  summary: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  availabilityNote: string | null;
  experienceYears: number;
  visibility: string;
  skills: string[];
  score: number;
  isFavorite: boolean;
};

type CompanyFavorite = {
  id: string;
  candidateId: string;
  name: string;
  headline: string | null;
  location: string | null;
  experienceYears: number;
  skills: string[];
};

type CompanyMatch = {
  candidateId: string;
  name: string;
  headline: string | null;
  location: string | null;
  experienceYears: number;
  skills: string[];
  score: number;
};

type CompanyContact = {
  id: string;
  candidateName: string;
  message: string;
  status: ContactStatusValue;
  createdAt: string;
  jobTitle: string | null;
};

type CompareCandidate = {
  id: string;
  name: string;
  headline: string | null;
  location: string | null;
  experienceYears: number;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  availabilityNote: string | null;
  skills: string[];
  summary: string | null;
  score: number;
};

function parseLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function formatMoney(min: number | null, max: number | null, currency: string) {
  if (!min && !max) {
    return "keine Angabe";
  }
  return `${min ?? "-"} - ${max ?? "-"} ${currency}`;
}

export default function CompanyDashboardPage() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [searchResults, setSearchResults] = useState<CandidateSearchResult[]>([]);
  const [favorites, setFavorites] = useState<CompanyFavorite[]>([]);
  const [matching, setMatching] = useState<CompanyMatch[]>([]);
  const [contacts, setContacts] = useState<CompanyContact[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareResults, setCompareResults] = useState<CompareCandidate[]>([]);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingJob, setSavingJob] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [searchSkills, setSearchSkills] = useState("");
  const [searchMinExperience, setSearchMinExperience] = useState("");
  const [searchMinSalary, setSearchMinSalary] = useState("");
  const [searchMaxSalary, setSearchMaxSalary] = useState("");
  const [searchAvailability, setSearchAvailability] = useState("");

  const [contactDrafts, setContactDrafts] = useState<Record<string, string>>({});
  const [contactJobSelection, setContactJobSelection] = useState<Record<string, string>>({});

  const [newJobTitle, setNewJobTitle] = useState("");
  const [newJobDescription, setNewJobDescription] = useState("");
  const [newJobLocation, setNewJobLocation] = useState("");
  const [newJobRemote, setNewJobRemote] = useState(false);
  const [newJobSalaryMin, setNewJobSalaryMin] = useState("");
  const [newJobSalaryMax, setNewJobSalaryMax] = useState("");
  const [newJobCurrency, setNewJobCurrency] = useState("EUR");
  const [newJobMinExp, setNewJobMinExp] = useState("0");
  const [newJobRequiredSkills, setNewJobRequiredSkills] = useState("");
  const [newJobPreferredSkills, setNewJobPreferredSkills] = useState("");
  const [newJobAvailability, setNewJobAvailability] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [profileRes, jobsRes, favoritesRes, matchingRes, contactsRes] = await Promise.all([
          fetch("/api/private/company/profile"),
          fetch("/api/private/company/jobs"),
          fetch("/api/private/company/favorites"),
          fetch("/api/private/company/matching"),
          fetch("/api/private/company/contact-requests"),
        ]);

        if (!profileRes.ok) {
          throw new Error("Unternehmensprofil konnte nicht geladen werden.");
        }

        const profileData = (await profileRes.json()) as { profile: CompanyProfile };
        setProfile(profileData.profile);

        if (jobsRes.ok) {
          const jobsData = (await jobsRes.json()) as { jobs: JobPosting[] };
          setJobs(jobsData.jobs ?? []);
        }

        if (favoritesRes.ok) {
          const favoritesData = (await favoritesRes.json()) as { favorites: CompanyFavorite[] };
          setFavorites(favoritesData.favorites ?? []);
        }

        if (matchingRes.ok) {
          const matchingData = (await matchingRes.json()) as { matches: CompanyMatch[] };
          setMatching(matchingData.matches ?? []);
        }

        if (contactsRes.ok) {
          const contactsData = (await contactsRes.json()) as { requests: CompanyContact[] };
          setContacts(contactsData.requests ?? []);
        }

        const initialSearchResponse = await fetch("/api/private/company/candidates");
        if (initialSearchResponse.ok) {
          const initialSearchData = (await initialSearchResponse.json()) as {
            results: CandidateSearchResult[];
          };
          setSearchResults(initialSearchData.results ?? []);
        }
      } catch (loadError) {
        console.error(loadError);
        setError("Dashboard konnte nicht geladen werden.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  useEffect(() => {
    async function loadCompare() {
      if (!compareIds.length) {
        setCompareResults([]);
        return;
      }

      const response = await fetch(`/api/private/company/compare?ids=${compareIds.join(",")}`);
      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { candidates: CompareCandidate[] };
      setCompareResults(data.candidates ?? []);
    }

    loadCompare();
  }, [compareIds]);

  const activeJobs = useMemo(() => jobs.filter((job) => job.active), [jobs]);

  async function reloadSupportData() {
    const [jobsRes, favoritesRes, matchingRes, contactsRes] = await Promise.all([
      fetch("/api/private/company/jobs"),
      fetch("/api/private/company/favorites"),
      fetch("/api/private/company/matching"),
      fetch("/api/private/company/contact-requests"),
    ]);

    if (jobsRes.ok) {
      const jobsData = (await jobsRes.json()) as { jobs: JobPosting[] };
      setJobs(jobsData.jobs ?? []);
    }

    if (favoritesRes.ok) {
      const favoritesData = (await favoritesRes.json()) as { favorites: CompanyFavorite[] };
      setFavorites(favoritesData.favorites ?? []);
    }

    if (matchingRes.ok) {
      const matchingData = (await matchingRes.json()) as { matches: CompanyMatch[] };
      setMatching(matchingData.matches ?? []);
    }

    if (contactsRes.ok) {
      const contactsData = (await contactsRes.json()) as { requests: CompanyContact[] };
      setContacts(contactsData.requests ?? []);
    }
  }

  async function runSearch(event?: FormEvent) {
    event?.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("query", searchQuery.trim());
    if (searchLocation.trim()) params.set("location", searchLocation.trim());
    if (searchSkills.trim()) params.set("skills", parseLines(searchSkills).join(","));
    if (searchMinExperience) params.set("minExperienceYears", searchMinExperience);
    if (searchMinSalary) params.set("minSalary", searchMinSalary);
    if (searchMaxSalary) params.set("maxSalary", searchMaxSalary);
    if (searchAvailability.trim()) params.set("availability", searchAvailability.trim());

    const response = await fetch(`/api/private/company/candidates?${params.toString()}`);
    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as { results: CandidateSearchResult[] };
    setSearchResults(data.results ?? []);
  }

  async function saveProfile(requestVerification: boolean) {
    if (!profile) {
      return;
    }

    setSavingProfile(true);
    setSuccess(null);
    setError(null);

    const response = await fetch("/api/private/company/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName: profile.companyName,
        legalName: profile.legalName ?? "",
        location: profile.location ?? "",
        industry: profile.industry ?? "",
        website: profile.website ?? "",
        description: profile.description ?? "",
        managingDirectorEmail: profile.managingDirectorEmail ?? "",
        employeeCount: profile.employeeCount,
        requestVerification,
      }),
    });

    if (!response.ok) {
      setError("Unternehmensprofil konnte nicht gespeichert werden.");
      setSavingProfile(false);
      return;
    }

    const data = (await response.json()) as { profile: CompanyProfile };
    setProfile(data.profile);
    setSuccess(
      requestVerification
        ? "Profil gespeichert und Verifizierungsanfrage gestellt."
        : "Unternehmensprofil gespeichert.",
    );
    setSavingProfile(false);
  }

  async function createJob(event: FormEvent) {
    event.preventDefault();
    setSavingJob(true);
    setSuccess(null);
    setError(null);

    const response = await fetch("/api/private/company/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newJobTitle,
        description: newJobDescription,
        location: newJobLocation,
        isRemote: newJobRemote,
        salaryMin: newJobSalaryMin ? Number(newJobSalaryMin) : null,
        salaryMax: newJobSalaryMax ? Number(newJobSalaryMax) : null,
        currency: newJobCurrency,
        minExperienceYears: Number(newJobMinExp) || 0,
        requiredSkills: parseLines(newJobRequiredSkills),
        preferredSkills: parseLines(newJobPreferredSkills),
        availabilityNote: newJobAvailability,
        active: true,
      }),
    });

    if (!response.ok) {
      setError("Stelle konnte nicht erstellt werden.");
      setSavingJob(false);
      return;
    }

    setNewJobTitle("");
    setNewJobDescription("");
    setNewJobLocation("");
    setNewJobRemote(false);
    setNewJobSalaryMin("");
    setNewJobSalaryMax("");
    setNewJobCurrency("EUR");
    setNewJobMinExp("0");
    setNewJobRequiredSkills("");
    setNewJobPreferredSkills("");
    setNewJobAvailability("");

    await reloadSupportData();
    await runSearch();
    setSuccess("Stelle wurde erfolgreich angelegt.");
    setSavingJob(false);
  }

  async function deleteJob(jobId: string) {
    const response = await fetch(`/api/private/company/jobs/${jobId}`, { method: "DELETE" });
    if (response.ok) {
      await reloadSupportData();
      await runSearch();
    }
  }

  async function toggleJobActive(job: JobPosting) {
    const response = await fetch(`/api/private/company/jobs/${job.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...job,
        requiredSkills: job.requiredSkills,
        preferredSkills: job.preferredSkills,
        active: !job.active,
      }),
    });

    if (response.ok) {
      await reloadSupportData();
      await runSearch();
    }
  }

  async function toggleFavorite(candidate: CandidateSearchResult) {
    const method = candidate.isFavorite ? "DELETE" : "POST";
    const response = await fetch("/api/private/company/favorites", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateProfileId: candidate.id }),
    });

    if (response.ok) {
      await runSearch();
      await reloadSupportData();
    }
  }

  async function sendContactRequest(candidateId: string) {
    const message = contactDrafts[candidateId]?.trim();
    if (!message || message.length < 10) {
      setError("Bitte gib eine aussagekräftige Nachricht mit mindestens 10 Zeichen ein.");
      return;
    }

    const response = await fetch("/api/private/company/contact-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidateProfileId: candidateId,
        message,
        jobPostingId: contactJobSelection[candidateId] || undefined,
      }),
    });

    if (!response.ok) {
      setError("Kontaktanfrage konnte nicht gesendet werden.");
      return;
    }

    setContactDrafts((current) => ({ ...current, [candidateId]: "" }));
    setContactJobSelection((current) => ({ ...current, [candidateId]: "" }));
    setSuccess("Kontaktanfrage wurde gesendet.");
    await reloadSupportData();
  }

  function toggleCompare(candidateId: string) {
    setCompareIds((current) => {
      if (current.includes(candidateId)) {
        return current.filter((id) => id !== candidateId);
      }

      if (current.length >= 5) {
        return current;
      }
      return [...current, candidateId];
    });
  }

  async function exportData() {
    window.open("/api/private/account/export", "_blank", "noopener,noreferrer");
  }

  async function deleteAccount() {
    const confirmed = window.confirm(
      "Möchtest du das Unternehmenskonto wirklich dauerhaft löschen? Diese Aktion kann nicht rückgängig gemacht werden.",
    );

    if (!confirmed) {
      return;
    }

    const response = await fetch("/api/private/account/delete", { method: "DELETE" });
    if (response.ok) {
      await signOut({ callbackUrl: "/" });
    }
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <p className="text-sm text-zinc-600">Dashboard wird geladen...</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Unternehmensprofil konnte nicht geladen werden.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Unternehmens-Dashboard</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Suche Kandidaten, verwalte Stellen und nutze Matching- sowie Vergleichsfunktionen.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm">
            Verifizierungsstatus: <strong>{profile.verificationStatus}</strong>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
        <h2 className="text-lg font-semibold">Unternehmensprofil</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Unternehmensname
            </span>
            <input
              value={profile.companyName}
              onChange={(event) => setProfile((current) => (current ? { ...current, companyName: event.target.value } : current))}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Rechtlicher Name
            </span>
            <input
              value={profile.legalName ?? ""}
              onChange={(event) => setProfile((current) => (current ? { ...current, legalName: event.target.value } : current))}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Standort
            </span>
            <input
              value={profile.location ?? ""}
              onChange={(event) => setProfile((current) => (current ? { ...current, location: event.target.value } : current))}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Branche
            </span>
            <input
              value={profile.industry ?? ""}
              onChange={(event) => setProfile((current) => (current ? { ...current, industry: event.target.value } : current))}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Website
            </span>
            <input
              value={profile.website ?? ""}
              onChange={(event) => setProfile((current) => (current ? { ...current, website: event.target.value } : current))}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Geschäftsführer-E-Mail
            </span>
            <input
              value={profile.managingDirectorEmail ?? ""}
              onChange={(event) =>
                setProfile((current) => (current ? { ...current, managingDirectorEmail: event.target.value } : current))
              }
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Mitarbeiterzahl
            </span>
            <input
              type="number"
              min={1}
              value={profile.employeeCount ?? ""}
              onChange={(event) =>
                setProfile((current) =>
                  current
                    ? {
                        ...current,
                        employeeCount: event.target.value ? Number(event.target.value) : null,
                      }
                    : current,
                )
              }
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Beschreibung
            </span>
            <textarea
              value={profile.description ?? ""}
              onChange={(event) => setProfile((current) => (current ? { ...current, description: event.target.value } : current))}
              className="h-24 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={savingProfile}
            onClick={() => saveProfile(false)}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
          >
            {savingProfile ? "Speichert..." : "Profil speichern"}
          </button>
          <button
            type="button"
            disabled={savingProfile || profile.verificationStatus !== VERIFICATION_STATUS.UNVERIFIED}
            onClick={() => saveProfile(true)}
            className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 disabled:opacity-60"
          >
            Verifizierung anfragen
          </button>
        </div>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <h2 className="text-lg font-semibold">Neue Stelle veröffentlichen</h2>
          <form className="mt-4 space-y-3" onSubmit={createJob}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Titel
                </span>
                <input
                  value={newJobTitle}
                  onChange={(event) => setNewJobTitle(event.target.value)}
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
                  required
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Beschreibung
                </span>
                <textarea
                  value={newJobDescription}
                  onChange={(event) => setNewJobDescription(event.target.value)}
                  className="h-20 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Standort
                </span>
                <input
                  value={newJobLocation}
                  onChange={(event) => setNewJobLocation(event.target.value)}
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
                />
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm sm:mt-6">
                <input
                  type="checkbox"
                  checked={newJobRemote}
                  onChange={(event) => setNewJobRemote(event.target.checked)}
                />
                Remote möglich
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Gehalt min.
                </span>
                <input
                  type="number"
                  value={newJobSalaryMin}
                  onChange={(event) => setNewJobSalaryMin(event.target.value)}
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Gehalt max.
                </span>
                <input
                  type="number"
                  value={newJobSalaryMax}
                  onChange={(event) => setNewJobSalaryMax(event.target.value)}
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Währung
                </span>
                <input
                  value={newJobCurrency}
                  onChange={(event) => setNewJobCurrency(event.target.value)}
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm uppercase outline-none ring-zinc-900/20 focus:ring-4"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Mindest-Erfahrung (Jahre)
                </span>
                <input
                  type="number"
                  min={0}
                  value={newJobMinExp}
                  onChange={(event) => setNewJobMinExp(event.target.value)}
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Pflichtskills (eine Zeile pro Skill)
                </span>
                <textarea
                  value={newJobRequiredSkills}
                  onChange={(event) => setNewJobRequiredSkills(event.target.value)}
                  className="h-20 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Wunschskills (eine Zeile pro Skill)
                </span>
                <textarea
                  value={newJobPreferredSkills}
                  onChange={(event) => setNewJobPreferredSkills(event.target.value)}
                  className="h-20 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Verfügbarkeits-Hinweis
                </span>
                <input
                  value={newJobAvailability}
                  onChange={(event) => setNewJobAvailability(event.target.value)}
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={savingJob}
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
            >
              {savingJob ? "Erstellt..." : "Stelle veröffentlichen"}
            </button>
          </form>
        </article>

        <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <h2 className="text-lg font-semibold">Stellenübersicht</h2>
          <div className="mt-4 space-y-3">
            {jobs.length ? (
              jobs.map((job) => (
                <div key={job.id} className="rounded-xl border border-zinc-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{job.title}</p>
                      <p className="text-xs text-zinc-500">
                        {job.isRemote ? "Remote" : job.location || "Standort offen"} ·{" "}
                        {formatMoney(job.salaryMin, job.salaryMax, job.currency)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        job.active ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-700"
                      }`}
                    >
                      {job.active ? "Aktiv" : "Inaktiv"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">
                    Pflichtskills: {job.requiredSkills.join(", ") || "keine"}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => toggleJobActive(job)}
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100"
                    >
                      {job.active ? "Deaktivieren" : "Aktivieren"}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteJob(job.id)}
                      className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
                    >
                      Löschen
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-600">Noch keine Stellen angelegt.</p>
            )}
          </div>
        </article>
      </section>

      <section className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
        <h2 className="text-lg font-semibold">Kandidatensuche mit Filtern</h2>
        <form onSubmit={runSearch} className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="block md:col-span-3">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Volltextsuche (Name, Headline, Skill)
            </span>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
              placeholder="z. B. TypeScript, Product Designer, Berlin ..."
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Standort
            </span>
            <input
              value={searchLocation}
              onChange={(event) => setSearchLocation(event.target.value)}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Skills (eine Zeile pro Skill)
            </span>
            <textarea
              value={searchSkills}
              onChange={(event) => setSearchSkills(event.target.value)}
              className="h-20 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Verfügbarkeits-Text
            </span>
            <input
              value={searchAvailability}
              onChange={(event) => setSearchAvailability(event.target.value)}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Erfahrung ab (Jahre)
            </span>
            <input
              type="number"
              min={0}
              value={searchMinExperience}
              onChange={(event) => setSearchMinExperience(event.target.value)}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Gehalt min.
            </span>
            <input
              type="number"
              value={searchMinSalary}
              onChange={(event) => setSearchMinSalary(event.target.value)}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Gehalt max.
            </span>
            <input
              type="number"
              value={searchMaxSalary}
              onChange={(event) => setSearchMaxSalary(event.target.value)}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
            />
          </label>
          <div className="md:col-span-3">
            <button
              type="submit"
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Kandidaten suchen
            </button>
          </div>
        </form>

        <div className="mt-5 space-y-3">
          {searchResults.length ? (
            searchResults.map((candidate) => {
              const compareChecked = compareIds.includes(candidate.id);
              return (
                <div key={candidate.id} className="rounded-xl border border-zinc-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">
                        {candidate.firstName} {candidate.lastName}
                      </p>
                      <p className="text-sm text-zinc-600">{candidate.headline ?? "Ohne Headline"}</p>
                      <p className="text-xs text-zinc-500">
                        {candidate.location || "Standort offen"} · {candidate.experienceYears} Jahre ·{" "}
                        {formatMoney(candidate.salaryMin, candidate.salaryMax, candidate.currency)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-white">
                        Match {candidate.score}%
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleFavorite(candidate)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                          candidate.isFavorite
                            ? "border-amber-300 bg-amber-50 text-amber-700"
                            : "border-zinc-300 hover:bg-zinc-100"
                        }`}
                      >
                        {candidate.isFavorite ? "Favorit entfernen" : "Zu Favoriten"}
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-zinc-700">{candidate.summary ?? "Keine Zusammenfassung."}</p>
                  <p className="mt-2 text-xs text-zinc-500">Skills: {candidate.skills.join(", ") || "keine"}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-2 text-xs text-zinc-600">
                      <input
                        type="checkbox"
                        checked={compareChecked}
                        onChange={() => toggleCompare(candidate.id)}
                      />
                      Für Vergleich markieren
                    </label>
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-[1fr,220px]">
                    <textarea
                      value={contactDrafts[candidate.id] ?? ""}
                      onChange={(event) =>
                        setContactDrafts((current) => ({
                          ...current,
                          [candidate.id]: event.target.value,
                        }))
                      }
                      className="h-20 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
                      placeholder="Kontaktanfrage an Kandidaten..."
                    />
                    <div className="space-y-2">
                      <select
                        value={contactJobSelection[candidate.id] ?? ""}
                        onChange={(event) =>
                          setContactJobSelection((current) => ({
                            ...current,
                            [candidate.id]: event.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
                      >
                        <option value="">Ohne Stellenbezug</option>
                        {activeJobs.map((job) => (
                          <option key={job.id} value={job.id}>
                            {job.title}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => sendContactRequest(candidate.id)}
                        className="w-full rounded-xl bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700"
                      >
                        Anfrage senden
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-zinc-600">Keine Kandidaten gefunden.</p>
          )}
        </div>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <h2 className="text-lg font-semibold">Favoritenliste</h2>
          <div className="mt-4 space-y-3">
            {favorites.length ? (
              favorites.map((favorite) => (
                <div key={favorite.id} className="rounded-xl border border-zinc-200 p-3">
                  <p className="font-medium">{favorite.name}</p>
                  <p className="text-sm text-zinc-600">{favorite.headline ?? "Ohne Headline"}</p>
                  <p className="text-xs text-zinc-500">
                    {favorite.location ?? "Standort offen"} · {favorite.experienceYears} Jahre
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">Skills: {favorite.skills.join(", ")}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-600">Noch keine Favoriten gespeichert.</p>
            )}
          </div>
        </article>

        <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <h2 className="text-lg font-semibold">Matching-Vorschläge</h2>
          <p className="mt-1 text-sm text-zinc-600">
            KI-ähnlicher Score aus Skills, Erfahrung, Standort und Gehalt.
          </p>
          <div className="mt-4 space-y-3">
            {matching.length ? (
              matching.map((entry) => (
                <div key={entry.candidateId} className="rounded-xl border border-zinc-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{entry.name}</p>
                      <p className="text-sm text-zinc-600">{entry.headline ?? "Ohne Headline"}</p>
                    </div>
                    <span className="rounded-full bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-white">
                      {entry.score}%
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">
                    {entry.location ?? "Standort offen"} · {entry.experienceYears} Jahre ·{" "}
                    {entry.skills.join(", ")}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-600">Noch keine Matching-Vorschläge vorhanden.</p>
            )}
          </div>
        </article>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <h2 className="text-lg font-semibold">Kandidatenvergleich</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Vergleiche ausgewählte Kandidaten direkt nebeneinander.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {compareResults.length ? (
              compareResults.map((candidate) => (
                <div key={candidate.id} className="rounded-xl border border-zinc-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{candidate.name}</p>
                    <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs text-white">
                      {candidate.score}%
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-600">{candidate.headline ?? "Ohne Headline"}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {candidate.location ?? "Standort offen"} · {candidate.experienceYears} Jahre
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Gehalt: {formatMoney(candidate.salaryMin, candidate.salaryMax, candidate.currency)}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Skills: {candidate.skills.join(", ") || "keine"}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-600">
                Markiere in den Suchergebnissen Kandidaten für den Vergleich (max. 5).
              </p>
            )}
          </div>
        </article>

        <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <h2 className="text-lg font-semibold">Gesendete Kontaktanfragen</h2>
          <div className="mt-4 space-y-3">
            {contacts.length ? (
              contacts.map((contact) => (
                <div key={contact.id} className="rounded-xl border border-zinc-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{contact.candidateName}</p>
                    <span className="rounded-full border border-zinc-300 px-2.5 py-1 text-xs font-medium">
                      {contact.status}
                    </span>
                  </div>
                  {contact.jobTitle ? (
                    <p className="mt-1 text-xs text-zinc-500">Stelle: {contact.jobTitle}</p>
                  ) : null}
                  <p className="mt-2 text-sm text-zinc-700">{contact.message}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-600">Noch keine Kontaktanfragen versendet.</p>
            )}
          </div>
        </article>
      </section>

      <section className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
        {error ? (
          <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {success}
          </p>
        ) : null}
        <h2 className="text-lg font-semibold">DSGVO & Datenrechte</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Datenexport und Konto-Löschung stehen jederzeit zur Verfügung.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportData}
            className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100"
          >
            Datenexport herunterladen
          </button>
          <button
            type="button"
            onClick={deleteAccount}
            className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
          >
            Unternehmenskonto löschen
          </button>
        </div>
      </section>
    </main>
  );
}
