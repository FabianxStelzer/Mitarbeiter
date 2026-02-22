"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";

const VISIBILITY_STATUS = {
  ACTIVE_SEARCH: "ACTIVE_SEARCH",
  OPEN_TO_OFFERS: "OPEN_TO_OFFERS",
  HIDDEN: "HIDDEN",
} as const;

type VisibilityStatusValue = (typeof VISIBILITY_STATUS)[keyof typeof VISIBILITY_STATUS];

const CONTACT_STATUS = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  DECLINED: "DECLINED",
} as const;

type ContactStatusValue = (typeof CONTACT_STATUS)[keyof typeof CONTACT_STATUS];

type CandidateProfileResponse = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  location: string | null;
  headline: string | null;
  summary: string | null;
  currentEmployer: string | null;
  hideFromCurrentEmployer: boolean;
  visibility: VisibilityStatusValue;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  availableFrom: string | null;
  availabilityNote: string | null;
  experienceYears: number;
  skills: string[];
  experiences: Array<{
    company: string;
    title: string;
    start?: string;
    end?: string | null;
    description?: string;
  }>;
  educations: Array<{
    institution: string;
    degree: string;
    field?: string;
    startYear?: number;
    endYear?: number;
  }>;
  certificates: Array<{
    name: string;
    issuer?: string;
    year?: number;
    url?: string;
  }>;
  portfolio: Array<{
    title: string;
    url?: string;
    description?: string;
    type?: "link" | "file";
  }>;
  preferredLocations: string[];
  preferredEmploymentTypes: string[];
  blockedCompanyIds: string[];
  blockedManagerEmails: string[];
};

type CandidateMatch = {
  jobId: string;
  title: string;
  companyName: string;
  location: string | null;
  remote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  requiredSkills: string[];
  score: number;
};

type ContactRequest = {
  id: string;
  companyName: string;
  message: string;
  status: ContactStatusValue;
  jobTitle: string | null;
  createdAt: string;
};

function linesToList(value: string) {
  return value
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function stringifyList(value: string[] | undefined) {
  return (value ?? []).join("\n");
}

function formatDateForInput(value: string | null | undefined) {
  if (!value) {
    return "";
  }
  return value.slice(0, 10);
}

function parseExperienceLines(value: string) {
  return linesToList(value).map((line) => {
    const [company = "", title = "", start = "", end = "", description = ""] = line
      .split("|")
      .map((part) => part.trim());
    return {
      company,
      title,
      start: start || undefined,
      end: end || null,
      description: description || undefined,
    };
  });
}

function parseEducationLines(value: string) {
  return linesToList(value).map((line) => {
    const [institution = "", degree = "", field = "", startYear = "", endYear = ""] = line
      .split("|")
      .map((part) => part.trim());
    return {
      institution,
      degree,
      field: field || undefined,
      startYear: startYear ? Number(startYear) : undefined,
      endYear: endYear ? Number(endYear) : undefined,
    };
  });
}

function parseCertificateLines(value: string) {
  return linesToList(value).map((line) => {
    const [name = "", issuer = "", year = "", url = ""] = line.split("|").map((part) => part.trim());
    return {
      name,
      issuer: issuer || undefined,
      year: year ? Number(year) : undefined,
      url: url || undefined,
    };
  });
}

function parsePortfolioLines(value: string) {
  return linesToList(value).map((line) => {
    const [title = "", url = "", description = "", type = "link"] = line
      .split("|")
      .map((part) => part.trim());
    return {
      title,
      url: url || undefined,
      description: description || undefined,
      type: type === "file" ? "file" : "link",
    };
  });
}

function serializeExperienceLines(experiences: CandidateProfileResponse["experiences"]) {
  return experiences
    .map(
      (item) =>
        `${item.company ?? ""}|${item.title ?? ""}|${item.start ?? ""}|${item.end ?? ""}|${item.description ?? ""}`,
    )
    .join("\n");
}

function serializeEducationLines(educations: CandidateProfileResponse["educations"]) {
  return educations
    .map(
      (item) =>
        `${item.institution ?? ""}|${item.degree ?? ""}|${item.field ?? ""}|${item.startYear ?? ""}|${item.endYear ?? ""}`,
    )
    .join("\n");
}

function serializeCertificateLines(certificates: CandidateProfileResponse["certificates"]) {
  return certificates
    .map((item) => `${item.name ?? ""}|${item.issuer ?? ""}|${item.year ?? ""}|${item.url ?? ""}`)
    .join("\n");
}

function serializePortfolioLines(portfolio: CandidateProfileResponse["portfolio"]) {
  return portfolio
    .map((item) => `${item.title ?? ""}|${item.url ?? ""}|${item.description ?? ""}|${item.type ?? "link"}`)
    .join("\n");
}

export default function CandidateDashboardPage() {
  const [profile, setProfile] = useState<CandidateProfileResponse | null>(null);
  const [matches, setMatches] = useState<CandidateMatch[]>([]);
  const [contacts, setContacts] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [skillsText, setSkillsText] = useState("");
  const [preferredLocationsText, setPreferredLocationsText] = useState("");
  const [preferredEmploymentTypesText, setPreferredEmploymentTypesText] = useState("");
  const [blockedCompanyIdsText, setBlockedCompanyIdsText] = useState("");
  const [blockedManagerEmailsText, setBlockedManagerEmailsText] = useState("");
  const [experiencesText, setExperiencesText] = useState("");
  const [educationsText, setEducationsText] = useState("");
  const [certificatesText, setCertificatesText] = useState("");
  const [portfolioText, setPortfolioText] = useState("");
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [profileRes, matchingRes, contactsRes] = await Promise.all([
          fetch("/api/private/candidate/profile"),
          fetch("/api/private/candidate/matching"),
          fetch("/api/private/candidate/contact-requests"),
        ]);

        if (!profileRes.ok) {
          throw new Error("Profil konnte nicht geladen werden.");
        }

        const profileData = (await profileRes.json()) as { profile: CandidateProfileResponse };
        setProfile(profileData.profile);
        setSkillsText(stringifyList(profileData.profile.skills));
        setPreferredLocationsText(stringifyList(profileData.profile.preferredLocations));
        setPreferredEmploymentTypesText(stringifyList(profileData.profile.preferredEmploymentTypes));
        setBlockedCompanyIdsText(stringifyList(profileData.profile.blockedCompanyIds));
        setBlockedManagerEmailsText(stringifyList(profileData.profile.blockedManagerEmails));
        setExperiencesText(serializeExperienceLines(profileData.profile.experiences));
        setEducationsText(serializeEducationLines(profileData.profile.educations));
        setCertificatesText(serializeCertificateLines(profileData.profile.certificates));
        setPortfolioText(serializePortfolioLines(profileData.profile.portfolio));

        if (matchingRes.ok) {
          const matchingData = (await matchingRes.json()) as { matches: CandidateMatch[] };
          setMatches(matchingData.matches ?? []);
        }

        if (contactsRes.ok) {
          const contactData = (await contactsRes.json()) as { requests: ContactRequest[] };
          setContacts(contactData.requests ?? []);
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

  const completionScore = useMemo(() => {
    if (!profile) {
      return 0;
    }

    const checkpoints = [
      Boolean(profile.headline),
      Boolean(profile.summary),
      Boolean(profile.location),
      profile.skills.length > 0,
      profile.experiences.length > 0,
      profile.educations.length > 0,
      profile.certificates.length > 0,
      profile.portfolio.length > 0,
      Boolean(profile.salaryMin || profile.salaryMax),
      Boolean(profile.availabilityNote || profile.availableFrom),
    ];

    return Math.round((checkpoints.filter(Boolean).length / checkpoints.length) * 100);
  }, [profile]);

  async function refreshContactsAndMatches() {
    const [matchingRes, contactsRes] = await Promise.all([
      fetch("/api/private/candidate/matching"),
      fetch("/api/private/candidate/contact-requests"),
    ]);

    if (matchingRes.ok) {
      const matchingData = (await matchingRes.json()) as { matches: CandidateMatch[] };
      setMatches(matchingData.matches ?? []);
    }

    if (contactsRes.ok) {
      const contactData = (await contactsRes.json()) as { requests: ContactRequest[] };
      setContacts(contactData.requests ?? []);
    }
  }

  async function saveProfile() {
    if (!profile) {
      return;
    }

    setSaving(true);
    setSaveMessage(null);
    setError(null);

    const payload = {
      ...profile,
      availableFrom: profile.availableFrom
        ? new Date(`${formatDateForInput(profile.availableFrom)}T00:00:00.000Z`).toISOString()
        : null,
      skills: linesToList(skillsText),
      preferredLocations: linesToList(preferredLocationsText),
      preferredEmploymentTypes: linesToList(preferredEmploymentTypesText),
      blockedCompanyIds: linesToList(blockedCompanyIdsText),
      blockedManagerEmails: linesToList(blockedManagerEmailsText),
      experiences: parseExperienceLines(experiencesText),
      educations: parseEducationLines(educationsText),
      certificates: parseCertificateLines(certificatesText),
      portfolio: parsePortfolioLines(portfolioText),
    };

    try {
      const response = await fetch("/api/private/candidate/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Speichern fehlgeschlagen.");
      }

      const updatedProfileResponse = await fetch("/api/private/candidate/profile");
      if (updatedProfileResponse.ok) {
        const updated = (await updatedProfileResponse.json()) as { profile: CandidateProfileResponse };
        setProfile(updated.profile);
      }

      await refreshContactsAndMatches();
      setSaveMessage("Profil wurde erfolgreich gespeichert.");
    } catch (saveError) {
      console.error(saveError);
      setError("Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload() {
    if (!fileToUpload) {
      return;
    }

    setUploadMessage(null);
    const formData = new FormData();
    formData.append("file", fileToUpload);

    const response = await fetch("/api/private/candidate/upload", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();

    if (!response.ok) {
      setUploadMessage(data?.error ?? "Upload fehlgeschlagen.");
      return;
    }

    setPortfolioText((previous) =>
      `${previous ? `${previous}\n` : ""}${data.originalName}|${data.url}|Upload über Plattform|file`,
    );
    setUploadMessage("Datei hochgeladen. Bitte Profil speichern.");
    setFileToUpload(null);
  }

  async function updateContactStatus(
    requestId: string,
    status: typeof CONTACT_STATUS.ACCEPTED | typeof CONTACT_STATUS.DECLINED,
  ) {
    const response = await fetch("/api/private/candidate/contact-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, status }),
    });

    if (response.ok) {
      await refreshContactsAndMatches();
    }
  }

  async function exportData() {
    window.open("/api/private/account/export", "_blank", "noopener,noreferrer");
  }

  async function deleteAccount() {
    const confirmed = window.confirm(
      "Möchtest du dein Konto wirklich dauerhaft löschen? Diese Aktion kann nicht rückgängig gemacht werden.",
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
          Profil konnte nicht geladen werden.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Kandidaten-Dashboard</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Pflege dein vollständiges Bewerbungsprofil und deine Sichtbarkeit.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm">
            Profilbewertung: <strong>{completionScore}%</strong>
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <h2 className="text-lg font-semibold">Persönliche Daten</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Vorname
              </span>
              <input
                value={profile.firstName}
                onChange={(event) => setProfile((current) => (current ? { ...current, firstName: event.target.value } : current))}
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Nachname
              </span>
              <input
                value={profile.lastName}
                onChange={(event) => setProfile((current) => (current ? { ...current, lastName: event.target.value } : current))}
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Headline
              </span>
              <input
                value={profile.headline ?? ""}
                onChange={(event) => setProfile((current) => (current ? { ...current, headline: event.target.value } : current))}
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
                placeholder="z. B. Senior Java Developerin"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Kurzprofil
              </span>
              <textarea
                value={profile.summary ?? ""}
                onChange={(event) => setProfile((current) => (current ? { ...current, summary: event.target.value } : current))}
                className="h-24 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
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
                Telefon
              </span>
              <input
                value={profile.phone ?? ""}
                onChange={(event) => setProfile((current) => (current ? { ...current, phone: event.target.value } : current))}
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Jahre Berufserfahrung
              </span>
              <input
                type="number"
                min={0}
                value={profile.experienceYears}
                onChange={(event) =>
                  setProfile((current) =>
                    current ? { ...current, experienceYears: Number(event.target.value) || 0 } : current,
                  )
                }
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Aktueller Arbeitgeber
              </span>
              <input
                value={profile.currentEmployer ?? ""}
                onChange={(event) => setProfile((current) => (current ? { ...current, currentEmployer: event.target.value } : current))}
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
              />
            </label>
          </div>
        </article>

        <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <h2 className="text-lg font-semibold">Gehalt, Verfügbarkeit & Sichtbarkeit</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Gehalt min.
              </span>
              <input
                type="number"
                value={profile.salaryMin ?? ""}
                onChange={(event) =>
                  setProfile((current) =>
                    current
                      ? { ...current, salaryMin: event.target.value ? Number(event.target.value) : null }
                      : current,
                  )
                }
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Gehalt max.
              </span>
              <input
                type="number"
                value={profile.salaryMax ?? ""}
                onChange={(event) =>
                  setProfile((current) =>
                    current
                      ? { ...current, salaryMax: event.target.value ? Number(event.target.value) : null }
                      : current,
                  )
                }
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Währung
              </span>
              <input
                value={profile.currency}
                onChange={(event) => setProfile((current) => (current ? { ...current, currency: event.target.value } : current))}
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm uppercase outline-none ring-zinc-900/20 focus:ring-4"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Verfügbar ab
              </span>
              <input
                type="date"
                value={formatDateForInput(profile.availableFrom)}
                onChange={(event) =>
                  setProfile((current) => (current ? { ...current, availableFrom: event.target.value || null } : current))
                }
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Verfügbarkeitsnotiz
              </span>
              <input
                value={profile.availabilityNote ?? ""}
                onChange={(event) =>
                  setProfile((current) => (current ? { ...current, availabilityNote: event.target.value } : current))
                }
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
                placeholder="z. B. 4 Wochen Kündigungsfrist"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Sichtbarkeitsstatus
              </span>
              <select
                value={profile.visibility}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  setProfile((current) =>
                    current
                      ? { ...current, visibility: event.target.value as VisibilityStatusValue }
                      : current,
                  )
                }
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
              >
                <option value={VISIBILITY_STATUS.ACTIVE_SEARCH}>Aktiv suchend</option>
                <option value={VISIBILITY_STATUS.OPEN_TO_OFFERS}>Offen für Angebote</option>
                <option value={VISIBILITY_STATUS.HIDDEN}>Unsichtbar</option>
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm sm:mt-6">
              <input
                type="checkbox"
                checked={profile.hideFromCurrentEmployer}
                onChange={(event) =>
                  setProfile((current) =>
                    current ? { ...current, hideFromCurrentEmployer: event.target.checked } : current,
                  )
                }
              />
              Aktueller Arbeitgeber darf Profil nicht sehen
            </label>
          </div>
        </article>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <h2 className="text-lg font-semibold">Skills & Präferenzen</h2>
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Skills (eine Zeile pro Skill)
              </span>
              <textarea
                value={skillsText}
                onChange={(event) => setSkillsText(event.target.value)}
                className="h-28 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Bevorzugte Standorte (eine Zeile pro Standort)
              </span>
              <textarea
                value={preferredLocationsText}
                onChange={(event) => setPreferredLocationsText(event.target.value)}
                className="h-24 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Bevorzugte Arbeitsmodelle (eine Zeile pro Modell)
              </span>
              <textarea
                value={preferredEmploymentTypesText}
                onChange={(event) => setPreferredEmploymentTypesText(event.target.value)}
                className="h-24 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
                placeholder="Vollzeit, Teilzeit, Hybrid, Remote ..."
              />
            </label>
          </div>
        </article>

        <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <h2 className="text-lg font-semibold">Privatsphäre-Einstellungen</h2>
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Blockierte Unternehmen (Company-IDs, je Zeile)
              </span>
              <textarea
                value={blockedCompanyIdsText}
                onChange={(event) => setBlockedCompanyIdsText(event.target.value)}
                className="h-24 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Blockierte Geschäftsführer (E-Mails, je Zeile)
              </span>
              <textarea
                value={blockedManagerEmailsText}
                onChange={(event) => setBlockedManagerEmailsText(event.target.value)}
                className="h-24 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
              />
            </label>
          </div>
        </article>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <h2 className="text-lg font-semibold">Berufserfahrung & Ausbildung</h2>
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Berufserfahrung (Firma|Rolle|Start|Ende|Beschreibung)
              </span>
              <textarea
                value={experiencesText}
                onChange={(event) => setExperiencesText(event.target.value)}
                className="h-32 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Ausbildung (Institution|Abschluss|Fach|Startjahr|Endjahr)
              </span>
              <textarea
                value={educationsText}
                onChange={(event) => setEducationsText(event.target.value)}
                className="h-28 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
              />
            </label>
          </div>
        </article>

        <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <h2 className="text-lg font-semibold">Zertifikate & Portfolio</h2>
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Zertifikate (Name|Aussteller|Jahr|URL)
              </span>
              <textarea
                value={certificatesText}
                onChange={(event) => setCertificatesText(event.target.value)}
                className="h-24 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Portfolio (Titel|URL/Pfad|Beschreibung|Typ[link/file])
              </span>
              <textarea
                value={portfolioText}
                onChange={(event) => setPortfolioText(event.target.value)}
                className="h-28 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
              />
            </label>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Portfolio-Datei hochladen
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  onChange={(event) => setFileToUpload(event.target.files?.[0] ?? null)}
                  className="text-sm"
                />
                <button
                  type="button"
                  onClick={handleUpload}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-zinc-100"
                >
                  Datei hochladen
                </button>
              </div>
              {uploadMessage ? <p className="mt-2 text-xs text-zinc-700">{uploadMessage}</p> : null}
            </div>
          </div>
        </article>
      </section>

      <section className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
        {error ? (
          <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
        {saveMessage ? (
          <p className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {saveMessage}
          </p>
        ) : null}
        <button
          type="button"
          onClick={saveProfile}
          disabled={saving}
          className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-60"
        >
          {saving ? "Speichert..." : "Profil speichern"}
        </button>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <h2 className="text-lg font-semibold">Passende Jobvorschläge</h2>
          <p className="mt-1 text-sm text-zinc-600">KI-Matching-Score auf Basis von Skills, Erfahrung und Präferenzen.</p>
          <div className="mt-4 space-y-3">
            {matches.length ? (
              matches.map((match) => (
                <div key={match.jobId} className="rounded-xl border border-zinc-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{match.title}</p>
                      <p className="text-sm text-zinc-600">{match.companyName}</p>
                    </div>
                    <span className="rounded-full bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-white">
                      {match.score}%
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">
                    {match.remote ? "Remote möglich" : match.location ?? "Standort offen"} ·{" "}
                    {match.requiredSkills.join(", ") || "Keine Pflichtskills"}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-600">Noch keine passenden Jobvorschläge gefunden.</p>
            )}
          </div>
        </article>

        <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <h2 className="text-lg font-semibold">Kontaktanfragen</h2>
          <p className="mt-1 text-sm text-zinc-600">Direkte Nachrichten von Unternehmen.</p>
          <div className="mt-4 space-y-3">
            {contacts.length ? (
              contacts.map((request) => (
                <div key={request.id} className="rounded-xl border border-zinc-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{request.companyName}</p>
                    <span className="rounded-full border border-zinc-300 px-2.5 py-1 text-xs font-medium">
                      {request.status}
                    </span>
                  </div>
                  {request.jobTitle ? (
                    <p className="mt-1 text-xs text-zinc-500">Bezug: {request.jobTitle}</p>
                  ) : null}
                  <p className="mt-2 text-sm text-zinc-700">{request.message}</p>
                  {request.status === CONTACT_STATUS.PENDING ? (
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => updateContactStatus(request.id, CONTACT_STATUS.ACCEPTED)}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
                      >
                        Annehmen
                      </button>
                      <button
                        type="button"
                        onClick={() => updateContactStatus(request.id, CONTACT_STATUS.DECLINED)}
                        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                      >
                        Ablehnen
                      </button>
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-600">Noch keine Kontaktanfragen vorhanden.</p>
            )}
          </div>
        </article>
      </section>

      <section className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
        <h2 className="text-lg font-semibold">DSGVO & Datenrechte</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Datenexport als JSON und Löschung des Kontos sind jederzeit möglich.
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
            Konto dauerhaft löschen
          </button>
        </div>
      </section>
    </main>
  );
}
