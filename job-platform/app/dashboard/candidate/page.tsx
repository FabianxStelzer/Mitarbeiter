"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import {
  APPLICATION_STAGES,
  APPLICATION_STAGE_LABELS,
  type ApplicationStageValue,
} from "@/lib/applications";

const VISIBILITY_STATUS = {
  ACTIVE_SEARCH: "ACTIVE_SEARCH",
  OPEN_TO_OFFERS: "OPEN_TO_OFFERS",
  HIDDEN: "HIDDEN",
} as const;

type VisibilityStatusValue = (typeof VISIBILITY_STATUS)[keyof typeof VISIBILITY_STATUS];
type CandidateTab = "profile" | "jobs" | "applications" | "messages";

type CandidateProfileResponse = {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
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
  experiences: Array<Record<string, unknown>>;
  educations: Array<Record<string, unknown>>;
  certificates: Array<Record<string, unknown>>;
  portfolio: Array<Record<string, unknown>>;
  preferredLocations: string[];
  preferredEmploymentTypes: string[];
  blockedCompanyIds: string[];
  blockedManagerEmails: string[];
};

type OpenJob = {
  id: string;
  title: string;
  companyName: string;
  companyId: string;
  location: string | null;
  remote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  requiredSkills: string[];
  description: string | null;
  hasApplied: boolean;
  applicationStage: ApplicationStageValue | null;
};

type CandidateApplication = {
  id: string;
  stage: ApplicationStageValue;
  createdAt: string;
  updatedAt: string;
  companyName: string;
  companyId: string;
  jobTitle: string;
  jobId: string;
  threadId: string | null;
};

type MessageThreadListEntry = {
  id: string;
  applicationId: string | null;
  jobTitle: string | null;
  company: { id: string; name: string };
  candidate: { id: string; name: string; avatarUrl: string | null };
  latestMessage: {
    id: string;
    content: string;
    senderRole: "CANDIDATE" | "COMPANY";
    createdAt: string;
  } | null;
  unreadCount: number;
  updatedAt: string;
};

type ThreadMessage = {
  id: string;
  senderRole: "CANDIDATE" | "COMPANY";
  content: string;
  createdAt: string;
  readAt: string | null;
};

type ThreadResponse = {
  thread: {
    id: string;
    applicationId: string | null;
    jobTitle: string | null;
    company: { id: string; name: string };
    candidate: { id: string; name: string; avatarUrl: string | null };
  };
  messages: ThreadMessage[];
};

function linesToList(value: string) {
  return value
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function formatMoney(min: number | null, max: number | null, currency: string) {
  if (!min && !max) {
    return "keine Angabe";
  }
  return `${min ?? "-"} - ${max ?? "-"} ${currency}`;
}

export default function CandidateDashboardPage() {
  const [activeTab, setActiveTab] = useState<CandidateTab>("jobs");
  const [profile, setProfile] = useState<CandidateProfileResponse | null>(null);
  const [skillsText, setSkillsText] = useState("");
  const [openJobs, setOpenJobs] = useState<OpenJob[]>([]);
  const [applications, setApplications] = useState<CandidateApplication[]>([]);
  const [threads, setThreads] = useState<MessageThreadListEntry[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<ThreadMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? null,
    [threads, activeThreadId],
  );

  const groupedApplications = useMemo(
    () =>
      APPLICATION_STAGES.reduce<Record<ApplicationStageValue, CandidateApplication[]>>(
        (acc, stage) => {
          acc[stage] = applications.filter((application) => application.stage === stage);
          return acc;
        },
        {
          APPLIED: [],
          INVITED: [],
          INTERVIEWS: [],
          HIRED: [],
          REJECTED: [],
        },
      ),
    [applications],
  );

  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      setError(null);
      try {
        const [profileRes, jobsRes, applicationsRes, threadsRes] = await Promise.all([
          fetch("/api/private/candidate/profile"),
          fetch("/api/private/candidate/open-jobs"),
          fetch("/api/private/candidate/applications"),
          fetch("/api/private/messages"),
        ]);

        if (!profileRes.ok) {
          throw new Error("Profil konnte nicht geladen werden.");
        }

        const profileData = (await profileRes.json()) as { profile: CandidateProfileResponse };
        setProfile(profileData.profile);
        setSkillsText(profileData.profile.skills.join("\n"));

        if (jobsRes.ok) {
          const jobsData = (await jobsRes.json()) as { jobs: OpenJob[] };
          setOpenJobs(jobsData.jobs ?? []);
        }

        if (applicationsRes.ok) {
          const appData = (await applicationsRes.json()) as { applications: CandidateApplication[] };
          setApplications(appData.applications ?? []);
        }

        if (threadsRes.ok) {
          const threadData = (await threadsRes.json()) as { threads: MessageThreadListEntry[] };
          setThreads(threadData.threads ?? []);
          if (threadData.threads?.length) {
            setActiveThreadId(threadData.threads[0].id);
          }
        }
      } catch (loadError) {
        console.error(loadError);
        setError("Dashboard konnte nicht geladen werden.");
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, []);

  useEffect(() => {
    async function loadThread() {
      if (!activeThreadId) {
        setThreadMessages([]);
        return;
      }

      const response = await fetch(`/api/private/messages/${activeThreadId}`);
      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as ThreadResponse;
      setThreadMessages(data.messages ?? []);
    }

    loadThread();
  }, [activeThreadId]);

  async function refreshJobsApplicationsAndThreads() {
    const [jobsRes, applicationsRes, threadsRes] = await Promise.all([
      fetch("/api/private/candidate/open-jobs"),
      fetch("/api/private/candidate/applications"),
      fetch("/api/private/messages"),
    ]);

    if (jobsRes.ok) {
      const jobsData = (await jobsRes.json()) as { jobs: OpenJob[] };
      setOpenJobs(jobsData.jobs ?? []);
    }

    if (applicationsRes.ok) {
      const appData = (await applicationsRes.json()) as { applications: CandidateApplication[] };
      setApplications(appData.applications ?? []);
    }

    if (threadsRes.ok) {
      const threadData = (await threadsRes.json()) as { threads: MessageThreadListEntry[] };
      setThreads(threadData.threads ?? []);
      if (activeThreadId && !threadData.threads.some((thread) => thread.id === activeThreadId)) {
        setActiveThreadId(threadData.threads[0]?.id ?? null);
      }
    }
  }

  async function saveProfile() {
    if (!profile) {
      return;
    }

    setSaving(true);
    setSuccess(null);
    setError(null);

    const payload = {
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone ?? "",
      avatarUrl: profile.avatarUrl ?? "",
      location: profile.location ?? "",
      headline: profile.headline ?? "",
      summary: profile.summary ?? "",
      currentEmployer: profile.currentEmployer ?? "",
      hideFromCurrentEmployer: profile.hideFromCurrentEmployer,
      visibility: profile.visibility,
      salaryMin: profile.salaryMin,
      salaryMax: profile.salaryMax,
      currency: profile.currency,
      availableFrom: profile.availableFrom,
      availabilityNote: profile.availabilityNote ?? "",
      experienceYears: profile.experienceYears,
      skills: linesToList(skillsText),
      experiences: profile.experiences,
      educations: profile.educations,
      certificates: profile.certificates,
      portfolio: profile.portfolio,
      preferredLocations: profile.preferredLocations,
      preferredEmploymentTypes: profile.preferredEmploymentTypes,
      blockedCompanyIds: profile.blockedCompanyIds,
      blockedManagerEmails: profile.blockedManagerEmails,
    };

    const response = await fetch("/api/private/candidate/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setError("Profil konnte nicht gespeichert werden.");
      setSaving(false);
      return;
    }

    const profileRes = await fetch("/api/private/candidate/profile");
    if (profileRes.ok) {
      const profileData = (await profileRes.json()) as { profile: CandidateProfileResponse };
      setProfile(profileData.profile);
      setSkillsText(profileData.profile.skills.join("\n"));
    }

    setSuccess("Profil erfolgreich gespeichert.");
    setSaving(false);
  }

  async function uploadAvatar(file: File | null) {
    if (!file || !profile) {
      return;
    }

    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/private/candidate/upload", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data?.error ?? "Bild-Upload fehlgeschlagen.");
      setUploading(false);
      return;
    }

    setProfile((current) => (current ? { ...current, avatarUrl: data.url } : current));
    setSuccess("Bild hochgeladen. Bitte Profil speichern.");
    setUploading(false);
  }

  async function applyToJob(jobId: string) {
    setSuccess(null);
    setError(null);
    const response = await fetch("/api/private/candidate/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobPostingId: jobId }),
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data?.error ?? "Bewerbung konnte nicht angelegt werden.");
      return;
    }

    setSuccess("Bewerbung erfolgreich angelegt.");
    await refreshJobsApplicationsAndThreads();
    if (data.threadId) {
      setActiveThreadId(data.threadId);
    }
    setActiveTab("applications");
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!activeThreadId || !messageText.trim()) {
      return;
    }

    const response = await fetch("/api/private/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        threadId: activeThreadId,
        content: messageText.trim(),
      }),
    });

    if (!response.ok) {
      setError("Nachricht konnte nicht gesendet werden.");
      return;
    }

    setMessageText("");
    const threadRes = await fetch(`/api/private/messages/${activeThreadId}`);
    if (threadRes.ok) {
      const threadData = (await threadRes.json()) as ThreadResponse;
      setThreadMessages(threadData.messages ?? []);
    }
    await refreshJobsApplicationsAndThreads();
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
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-sm text-zinc-600">Dashboard wird geladen...</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Kandidatenprofil konnte nicht geladen werden.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <section className="rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-700 p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-300">Arbeitnehmer</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
              Willkommen, {profile.firstName}
            </h1>
            <p className="mt-2 text-sm text-zinc-200">
              Kommunikation läuft ausschließlich über die Plattform. E-Mail und Telefonnummer
              werden nicht an Unternehmen ausgegeben.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm backdrop-blur">
            Sichtbarkeit: <strong>{profile.visibility}</strong>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm">
        <div className="grid gap-2 md:grid-cols-4">
          {[
            { key: "jobs", label: "Offene Stellen" },
            { key: "applications", label: "Bewerbungen" },
            { key: "messages", label: "Nachrichten" },
            { key: "profile", label: "Profil" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as CandidateTab)}
              className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                activeTab === tab.key
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {error ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </p>
      ) : null}

      {activeTab === "jobs" ? (
        <section className="mt-4 space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">Unternehmen mit offenen Stellen</h2>
          {openJobs.length ? (
            openJobs.map((job) => (
              <article key={job.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">{job.title}</p>
                    <p className="text-sm text-zinc-600">{job.companyName}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {job.remote ? "Remote möglich" : job.location ?? "Standort offen"} ·{" "}
                      {formatMoney(job.salaryMin, job.salaryMax, job.currency)}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={job.hasApplied}
                    onClick={() => applyToJob(job.id)}
                    className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                      job.hasApplied
                        ? "cursor-not-allowed border border-zinc-300 bg-zinc-100 text-zinc-500"
                        : "bg-zinc-900 text-white hover:bg-zinc-700"
                    }`}
                  >
                    {job.hasApplied
                      ? `Bereits beworben (${job.applicationStage ?? "APPLIED"})`
                      : "Jetzt bewerben"}
                  </button>
                </div>
                <p className="mt-3 text-sm text-zinc-700">{job.description ?? "Keine Beschreibung."}</p>
                <p className="mt-2 text-xs text-zinc-500">
                  Skills: {job.requiredSkills.join(", ") || "keine Angabe"}
                </p>
              </article>
            ))
          ) : (
            <p className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
              Aktuell sind keine offenen Stellen sichtbar.
            </p>
          )}
        </section>
      ) : null}

      {activeTab === "applications" ? (
        <section className="mt-4">
          <h2 className="text-xl font-semibold tracking-tight">Bewerbungen</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Status-Board deiner Bewerbungen. Unternehmen können dich per Drag-and-drop zwischen den
            Phasen verschieben.
          </p>
          <div className="mt-4 grid gap-3 xl:grid-cols-5">
            {APPLICATION_STAGES.map((stage) => (
              <div key={stage} className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
                <h3 className="text-sm font-semibold">{APPLICATION_STAGE_LABELS[stage]}</h3>
                <div className="mt-3 space-y-2">
                  {groupedApplications[stage].length ? (
                    groupedApplications[stage].map((application) => (
                      <div key={application.id} className="rounded-xl border border-zinc-200 p-3">
                        <p className="text-sm font-medium">{application.jobTitle}</p>
                        <p className="text-xs text-zinc-600">{application.companyName}</p>
                        <p className="mt-1 text-[11px] text-zinc-500">
                          Aktualisiert: {new Date(application.updatedAt).toLocaleDateString("de-DE")}
                        </p>
                        {application.threadId ? (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveThreadId(application.threadId);
                              setActiveTab("messages");
                            }}
                            className="mt-2 rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium hover:bg-zinc-100"
                          >
                            Nachricht öffnen
                          </button>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-zinc-500">Keine Einträge</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === "messages" ? (
        <section className="mt-4 grid gap-4 lg:grid-cols-[320px,1fr]">
          <article className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
            <h2 className="px-2 pb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Nachrichten
            </h2>
            <div className="space-y-2">
              {threads.length ? (
                threads.map((thread) => (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => setActiveThreadId(thread.id)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      activeThreadId === thread.id
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 bg-white hover:bg-zinc-50"
                    }`}
                  >
                    <p className="text-sm font-medium">{thread.company.name}</p>
                    <p
                      className={`mt-0.5 text-xs ${
                        activeThreadId === thread.id ? "text-zinc-300" : "text-zinc-600"
                      }`}
                    >
                      {thread.jobTitle ?? "Allgemeiner Chat"}
                    </p>
                    {thread.latestMessage ? (
                      <p
                        className={`mt-1 line-clamp-2 text-xs ${
                          activeThreadId === thread.id ? "text-zinc-300" : "text-zinc-500"
                        }`}
                      >
                        {thread.latestMessage.content}
                      </p>
                    ) : null}
                  </button>
                ))
              ) : (
                <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
                  Noch keine Nachrichten.
                </p>
              )}
            </div>
          </article>
          <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            {activeThread ? (
              <>
                <div className="border-b border-zinc-200 pb-3">
                  <p className="text-sm font-semibold">{activeThread.company.name}</p>
                  <p className="text-xs text-zinc-500">{activeThread.jobTitle ?? "Allgemeiner Chat"}</p>
                </div>
                <div className="mt-3 h-[380px] space-y-2 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  {threadMessages.length ? (
                    threadMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                          message.senderRole === "CANDIDATE"
                            ? "ml-auto bg-zinc-900 text-white"
                            : "bg-white text-zinc-800"
                        }`}
                      >
                        <p>{message.content}</p>
                        <p
                          className={`mt-1 text-[11px] ${
                            message.senderRole === "CANDIDATE" ? "text-zinc-300" : "text-zinc-500"
                          }`}
                        >
                          {new Date(message.createdAt).toLocaleString("de-DE")}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-zinc-500">Noch keine Nachrichten in diesem Chat.</p>
                  )}
                </div>
                <form onSubmit={sendMessage} className="mt-3 flex gap-2">
                  <input
                    value={messageText}
                    onChange={(event) => setMessageText(event.target.value)}
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
                    placeholder="Nachricht schreiben..."
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
                  >
                    Senden
                  </button>
                </form>
              </>
            ) : (
              <p className="text-sm text-zinc-600">Wähle links einen Chat aus.</p>
            )}
          </article>
        </section>
      ) : null}

      {activeTab === "profile" ? (
        <section className="mt-4 space-y-4">
          <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold tracking-tight">Profil & Sichtbarkeit</h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-[220px,1fr]">
              <div className="space-y-3">
                <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 text-2xl font-semibold text-zinc-500">
                  {profile.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.avatarUrl} alt="Profilbild" className="h-full w-full object-cover" />
                  ) : (
                    <span>{profile.firstName.slice(0, 1)}{profile.lastName.slice(0, 1)}</span>
                  )}
                </div>
                <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Profilbild hochladen
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => void uploadAvatar(event.target.files?.[0] ?? null)}
                    className="mt-2 block w-full text-sm"
                    disabled={uploading}
                  />
                </label>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Vorname
                  </span>
                  <input
                    value={profile.firstName}
                    onChange={(event) =>
                      setProfile((current) => (current ? { ...current, firstName: event.target.value } : current))
                    }
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Nachname
                  </span>
                  <input
                    value={profile.lastName}
                    onChange={(event) =>
                      setProfile((current) => (current ? { ...current, lastName: event.target.value } : current))
                    }
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Headline
                  </span>
                  <input
                    value={profile.headline ?? ""}
                    onChange={(event) =>
                      setProfile((current) => (current ? { ...current, headline: event.target.value } : current))
                    }
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
                    placeholder="z. B. Senior Frontend Engineer"
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Kurzprofil
                  </span>
                  <textarea
                    value={profile.summary ?? ""}
                    onChange={(event) =>
                      setProfile((current) => (current ? { ...current, summary: event.target.value } : current))
                    }
                    className="h-24 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Standort
                  </span>
                  <input
                    value={profile.location ?? ""}
                    onChange={(event) =>
                      setProfile((current) => (current ? { ...current, location: event.target.value } : current))
                    }
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Jahre Erfahrung
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
                    Gehalt min.
                  </span>
                  <input
                    type="number"
                    value={profile.salaryMin ?? ""}
                    onChange={(event) =>
                      setProfile((current) =>
                        current
                          ? {
                              ...current,
                              salaryMin: event.target.value ? Number(event.target.value) : null,
                            }
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
                          ? {
                              ...current,
                              salaryMax: event.target.value ? Number(event.target.value) : null,
                            }
                          : current,
                      )
                    }
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Skills (eine Zeile pro Skill)
                  </span>
                  <textarea
                    value={skillsText}
                    onChange={(event) => setSkillsText(event.target.value)}
                    className="h-24 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Sichtbarkeit
                  </span>
                  <select
                    value={profile.visibility}
                    onChange={(event) =>
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
                <label className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm md:mt-6">
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
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={saveProfile}
                disabled={saving}
                className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
              >
                {saving ? "Speichert..." : "Profil speichern"}
              </button>
              <button
                type="button"
                onClick={exportData}
                className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100"
              >
                Datenexport
              </button>
              <button
                type="button"
                onClick={deleteAccount}
                className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
              >
                Konto löschen
              </button>
            </div>
          </article>
        </section>
      ) : null}
    </main>
  );
}
