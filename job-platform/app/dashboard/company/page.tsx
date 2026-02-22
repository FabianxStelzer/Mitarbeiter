"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import {
  APPLICATION_STAGES,
  APPLICATION_STAGE_LABELS,
  type ApplicationStageValue,
} from "@/lib/applications";

type CompanyTab = "jobs" | "candidates" | "applications" | "messages" | "profile";
type VerificationStatusValue = "UNVERIFIED" | "PENDING" | "VERIFIED";

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
  avatarUrl: string | null;
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

type CompanyApplication = {
  id: string;
  stage: ApplicationStageValue;
  createdAt: string;
  updatedAt: string;
  candidateId: string;
  candidateName: string;
  candidateAvatarUrl: string | null;
  candidateHeadline: string | null;
  candidateLocation: string | null;
  jobId: string;
  jobTitle: string;
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
  const [activeTab, setActiveTab] = useState<CompanyTab>("applications");
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [candidates, setCandidates] = useState<CandidateSearchResult[]>([]);
  const [applications, setApplications] = useState<CompanyApplication[]>([]);
  const [threads, setThreads] = useState<MessageThreadListEntry[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<ThreadMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [candidateMessageDrafts, setCandidateMessageDrafts] = useState<Record<string, string>>({});
  const [draggedApplicationId, setDraggedApplicationId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingJob, setSavingJob] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [searchSkills, setSearchSkills] = useState("");
  const [searchMinExperience, setSearchMinExperience] = useState("");

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

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? null,
    [threads, activeThreadId],
  );

  const groupedApplications = useMemo(
    () =>
      APPLICATION_STAGES.reduce<Record<ApplicationStageValue, CompanyApplication[]>>(
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
        const [profileRes, jobsRes, candidatesRes, applicationsRes, threadsRes] = await Promise.all([
          fetch("/api/private/company/profile"),
          fetch("/api/private/company/jobs"),
          fetch("/api/private/company/candidates"),
          fetch("/api/private/company/applications"),
          fetch("/api/private/messages"),
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

        if (candidatesRes.ok) {
          const candidateData = (await candidatesRes.json()) as { results: CandidateSearchResult[] };
          setCandidates(candidateData.results ?? []);
        }

        if (applicationsRes.ok) {
          const appData = (await applicationsRes.json()) as { applications: CompanyApplication[] };
          setApplications(appData.applications ?? []);
        }

        if (threadsRes.ok) {
          const threadData = (await threadsRes.json()) as { threads: MessageThreadListEntry[] };
          setThreads(threadData.threads ?? []);
          if (threadData.threads.length) {
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

  async function refreshCompanyData() {
    const [jobsRes, candidatesRes, applicationsRes, threadsRes] = await Promise.all([
      fetch("/api/private/company/jobs"),
      fetch("/api/private/company/candidates"),
      fetch("/api/private/company/applications"),
      fetch("/api/private/messages"),
    ]);

    if (jobsRes.ok) {
      const jobsData = (await jobsRes.json()) as { jobs: JobPosting[] };
      setJobs(jobsData.jobs ?? []);
    }
    if (candidatesRes.ok) {
      const candidateData = (await candidatesRes.json()) as { results: CandidateSearchResult[] };
      setCandidates(candidateData.results ?? []);
    }
    if (applicationsRes.ok) {
      const appData = (await applicationsRes.json()) as { applications: CompanyApplication[] };
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

  async function runCandidateSearch(event?: FormEvent) {
    event?.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("query", searchQuery.trim());
    if (searchLocation.trim()) params.set("location", searchLocation.trim());
    if (searchSkills.trim()) params.set("skills", parseLines(searchSkills).join(","));
    if (searchMinExperience.trim()) params.set("minExperienceYears", searchMinExperience.trim());

    const response = await fetch(`/api/private/company/candidates?${params.toString()}`);
    if (!response.ok) {
      return;
    }
    const data = (await response.json()) as { results: CandidateSearchResult[] };
    setCandidates(data.results ?? []);
  }

  async function saveProfile(requestVerification: boolean) {
    if (!profile) {
      return;
    }

    setSavingProfile(true);
    setError(null);
    setSuccess(null);

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
        ? "Profil gespeichert und Verifizierungsanfrage gesendet."
        : "Unternehmensprofil gespeichert.",
    );
    setSavingProfile(false);
  }

  async function createJob(event: FormEvent) {
    event.preventDefault();
    setSavingJob(true);
    setError(null);
    setSuccess(null);

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

    await refreshCompanyData();
    setSuccess("Stelle veröffentlicht.");
    setSavingJob(false);
  }

  async function toggleJobActive(job: JobPosting) {
    await fetch(`/api/private/company/jobs/${job.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...job,
        requiredSkills: job.requiredSkills,
        preferredSkills: job.preferredSkills,
        active: !job.active,
      }),
    });
    await refreshCompanyData();
  }

  async function deleteJob(jobId: string) {
    await fetch(`/api/private/company/jobs/${jobId}`, { method: "DELETE" });
    await refreshCompanyData();
  }

  async function moveApplicationToStage(applicationId: string, stage: ApplicationStageValue) {
    const response = await fetch("/api/private/company/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId, stage }),
    });

    if (!response.ok) {
      setError("Bewerbungsstatus konnte nicht aktualisiert werden.");
      return;
    }
    await refreshCompanyData();
  }

  async function sendMessageToCandidate(candidateId: string) {
    const draft = candidateMessageDrafts[candidateId]?.trim();
    if (!draft) {
      setError("Bitte gib zuerst eine Nachricht ein.");
      return;
    }

    const response = await fetch("/api/private/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidateProfileId: candidateId,
        content: draft,
      }),
    });

    if (!response.ok) {
      setError("Nachricht konnte nicht gesendet werden.");
      return;
    }

    const data = await response.json();
    setCandidateMessageDrafts((current) => ({ ...current, [candidateId]: "" }));
    await refreshCompanyData();
    if (data.threadId) {
      setActiveThreadId(data.threadId);
      setActiveTab("messages");
    }
  }

  async function sendMessageInThread(event: FormEvent) {
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
    await refreshCompanyData();
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
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-sm text-zinc-600">Dashboard wird geladen...</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Unternehmensprofil konnte nicht geladen werden.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <section className="rounded-3xl bg-gradient-to-br from-indigo-900 via-zinc-900 to-zinc-800 p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Unternehmen</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
              Recruiting Hub: {profile.companyName}
            </h1>
            <p className="mt-2 text-sm text-zinc-200">
              Moderne Pipeline mit Kanban-Bewerbungen und direkter Plattform-Kommunikation.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm backdrop-blur">
            Verifizierung: <strong>{profile.verificationStatus}</strong>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm">
        <div className="grid gap-2 md:grid-cols-5">
          {[
            { key: "applications", label: "Bewerbungen" },
            { key: "messages", label: "Nachrichten" },
            { key: "candidates", label: "Kandidaten" },
            { key: "jobs", label: "Offene Stellen" },
            { key: "profile", label: "Unternehmen" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as CompanyTab)}
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

      {activeTab === "applications" ? (
        <section className="mt-4">
          <h2 className="text-xl font-semibold tracking-tight">Bewerbungs-Kanban</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Kandidaten per Drag-and-drop verschieben: Beworben, Eingeladen, Interviews,
            Eingestellt, Abgelehnt.
          </p>
          <div className="mt-4 grid gap-3 xl:grid-cols-5">
            {APPLICATION_STAGES.map((stage) => (
              <div
                key={stage}
                className="min-h-[220px] rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm"
                onDragOver={(event) => event.preventDefault()}
                onDrop={async () => {
                  if (!draggedApplicationId) {
                    return;
                  }
                  await moveApplicationToStage(draggedApplicationId, stage);
                  setDraggedApplicationId(null);
                }}
              >
                <h3 className="text-sm font-semibold">{APPLICATION_STAGE_LABELS[stage]}</h3>
                <div className="mt-3 space-y-2">
                  {groupedApplications[stage].length ? (
                    groupedApplications[stage].map((application) => (
                      <div
                        key={application.id}
                        draggable
                        onDragStart={() => setDraggedApplicationId(application.id)}
                        className="cursor-grab rounded-xl border border-zinc-200 bg-zinc-50 p-3 active:cursor-grabbing"
                      >
                        <p className="text-sm font-medium">{application.candidateName}</p>
                        <p className="text-xs text-zinc-600">{application.jobTitle}</p>
                        <p className="mt-1 text-[11px] text-zinc-500">
                          {application.candidateLocation ?? "Standort offen"}
                        </p>
                        {application.threadId ? (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveThreadId(application.threadId);
                              setActiveTab("messages");
                            }}
                            className="mt-2 rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium hover:bg-white"
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
                    <p className="text-sm font-medium">{thread.candidate.name}</p>
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
                  <p className="text-sm font-semibold">{activeThread.candidate.name}</p>
                  <p className="text-xs text-zinc-500">{activeThread.jobTitle ?? "Allgemeiner Chat"}</p>
                </div>
                <div className="mt-3 h-[380px] space-y-2 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  {threadMessages.length ? (
                    threadMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                          message.senderRole === "COMPANY"
                            ? "ml-auto bg-zinc-900 text-white"
                            : "bg-white text-zinc-800"
                        }`}
                      >
                        <p>{message.content}</p>
                        <p
                          className={`mt-1 text-[11px] ${
                            message.senderRole === "COMPANY" ? "text-zinc-300" : "text-zinc-500"
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
                <form onSubmit={sendMessageInThread} className="mt-3 flex gap-2">
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

      {activeTab === "candidates" ? (
        <section className="mt-4 space-y-4">
          <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Kandidatensuche</h2>
            <form onSubmit={runCandidateSearch} className="mt-3 grid gap-3 md:grid-cols-4">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4 md:col-span-2"
                placeholder="Name, Headline oder Skill"
              />
              <input
                value={searchLocation}
                onChange={(event) => setSearchLocation(event.target.value)}
                className="rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
                placeholder="Standort"
              />
              <input
                value={searchMinExperience}
                onChange={(event) => setSearchMinExperience(event.target.value)}
                type="number"
                min={0}
                className="rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
                placeholder="Erfahrung ab"
              />
              <textarea
                value={searchSkills}
                onChange={(event) => setSearchSkills(event.target.value)}
                className="h-20 rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4 md:col-span-3"
                placeholder="Skills (eine Zeile pro Skill)"
              />
              <button
                type="submit"
                className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
              >
                Suchen
              </button>
            </form>
          </article>

          <div className="space-y-3">
            {candidates.length ? (
              candidates.map((candidate) => (
                <article key={candidate.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-zinc-200 text-sm font-semibold text-zinc-600">
                        {candidate.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={candidate.avatarUrl} alt={candidate.firstName} className="h-full w-full object-cover" />
                        ) : (
                          <span>{candidate.firstName.slice(0, 1)}{candidate.lastName.slice(0, 1)}</span>
                        )}
                      </div>
                      <div>
                        <p className="text-base font-semibold">
                          {candidate.firstName} {candidate.lastName}
                        </p>
                        <p className="text-sm text-zinc-600">{candidate.headline ?? "Ohne Headline"}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {candidate.location ?? "Standort offen"} · {candidate.experienceYears} Jahre · Match{" "}
                          {candidate.score}%
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-white">
                      {candidate.visibility}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-zinc-700">{candidate.summary ?? "Keine Zusammenfassung."}</p>
                  <p className="mt-2 text-xs text-zinc-500">Skills: {candidate.skills.join(", ") || "keine"}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Gehalt: {formatMoney(candidate.salaryMin, candidate.salaryMax, candidate.currency)}
                  </p>
                  <div className="mt-3 grid gap-2 md:grid-cols-[1fr,140px]">
                    <textarea
                      value={candidateMessageDrafts[candidate.id] ?? ""}
                      onChange={(event) =>
                        setCandidateMessageDrafts((current) => ({
                          ...current,
                          [candidate.id]: event.target.value,
                        }))
                      }
                      className="h-20 rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
                      placeholder="Nachricht an Kandidat..."
                    />
                    <button
                      type="button"
                      onClick={() => void sendMessageToCandidate(candidate.id)}
                      className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700"
                    >
                      Nachricht senden
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <p className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
                Keine Kandidaten gefunden.
              </p>
            )}
          </div>
        </section>
      ) : null}

      {activeTab === "jobs" ? (
        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Neue Stelle veröffentlichen</h2>
            <form onSubmit={createJob} className="mt-3 space-y-3">
              <input
                value={newJobTitle}
                onChange={(event) => setNewJobTitle(event.target.value)}
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
                placeholder="Stellentitel"
                required
              />
              <textarea
                value={newJobDescription}
                onChange={(event) => setNewJobDescription(event.target.value)}
                className="h-24 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
                placeholder="Beschreibung"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={newJobLocation}
                  onChange={(event) => setNewJobLocation(event.target.value)}
                  className="rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
                  placeholder="Standort"
                />
                <label className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={newJobRemote}
                    onChange={(event) => setNewJobRemote(event.target.checked)}
                  />
                  Remote möglich
                </label>
                <input
                  value={newJobSalaryMin}
                  onChange={(event) => setNewJobSalaryMin(event.target.value)}
                  type="number"
                  className="rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
                  placeholder="Gehalt min."
                />
                <input
                  value={newJobSalaryMax}
                  onChange={(event) => setNewJobSalaryMax(event.target.value)}
                  type="number"
                  className="rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
                  placeholder="Gehalt max."
                />
                <input
                  value={newJobCurrency}
                  onChange={(event) => setNewJobCurrency(event.target.value)}
                  className="rounded-xl border border-zinc-300 px-3 py-2 text-sm uppercase outline-none ring-zinc-900/20 focus:ring-4"
                  placeholder="Währung"
                />
                <input
                  value={newJobMinExp}
                  onChange={(event) => setNewJobMinExp(event.target.value)}
                  type="number"
                  min={0}
                  className="rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
                  placeholder="Mindest-Erfahrung"
                />
              </div>
              <textarea
                value={newJobRequiredSkills}
                onChange={(event) => setNewJobRequiredSkills(event.target.value)}
                className="h-20 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
                placeholder="Pflichtskills (eine Zeile pro Skill)"
              />
              <textarea
                value={newJobPreferredSkills}
                onChange={(event) => setNewJobPreferredSkills(event.target.value)}
                className="h-20 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
                placeholder="Wunschskills (eine Zeile pro Skill)"
              />
              <input
                value={newJobAvailability}
                onChange={(event) => setNewJobAvailability(event.target.value)}
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
                placeholder="Verfügbarkeits-Hinweis"
              />
              <button
                type="submit"
                disabled={savingJob}
                className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
              >
                {savingJob ? "Erstellt..." : "Stelle veröffentlichen"}
              </button>
            </form>
          </article>

          <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Offene Stellen</h2>
            <div className="mt-3 space-y-3">
              {jobs.length ? (
                jobs.map((job) => (
                  <div key={job.id} className="rounded-xl border border-zinc-200 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{job.title}</p>
                        <p className="text-xs text-zinc-500">
                          {job.isRemote ? "Remote" : job.location ?? "Standort offen"} ·{" "}
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
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => void toggleJobActive(job)}
                        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100"
                      >
                        {job.active ? "Deaktivieren" : "Aktivieren"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteJob(job.id)}
                        className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
                      >
                        Löschen
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-600">Noch keine Stellen veröffentlicht.</p>
              )}
            </div>
          </article>
        </section>
      ) : null}

      {activeTab === "profile" ? (
        <section className="mt-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Unternehmensprofil</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              value={profile.companyName}
              onChange={(event) =>
                setProfile((current) => (current ? { ...current, companyName: event.target.value } : current))
              }
              className="rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
              placeholder="Unternehmensname"
            />
            <input
              value={profile.legalName ?? ""}
              onChange={(event) =>
                setProfile((current) => (current ? { ...current, legalName: event.target.value } : current))
              }
              className="rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
              placeholder="Rechtlicher Name"
            />
            <input
              value={profile.location ?? ""}
              onChange={(event) =>
                setProfile((current) => (current ? { ...current, location: event.target.value } : current))
              }
              className="rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
              placeholder="Standort"
            />
            <input
              value={profile.industry ?? ""}
              onChange={(event) =>
                setProfile((current) => (current ? { ...current, industry: event.target.value } : current))
              }
              className="rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
              placeholder="Branche"
            />
            <input
              value={profile.website ?? ""}
              onChange={(event) =>
                setProfile((current) => (current ? { ...current, website: event.target.value } : current))
              }
              className="rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
              placeholder="Website"
            />
            <input
              value={profile.managingDirectorEmail ?? ""}
              onChange={(event) =>
                setProfile((current) =>
                  current ? { ...current, managingDirectorEmail: event.target.value } : current,
                )
              }
              className="rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
              placeholder="Geschäftsführer-E-Mail"
            />
            <input
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
              type="number"
              min={1}
              className="rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4"
              placeholder="Mitarbeiterzahl"
            />
            <textarea
              value={profile.description ?? ""}
              onChange={(event) =>
                setProfile((current) => (current ? { ...current, description: event.target.value } : current))
              }
              className="h-24 rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-900/20 focus:ring-4 md:col-span-2"
              placeholder="Unternehmensbeschreibung"
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={savingProfile}
              onClick={() => void saveProfile(false)}
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
            >
              {savingProfile ? "Speichert..." : "Profil speichern"}
            </button>
            <button
              type="button"
              disabled={savingProfile || profile.verificationStatus !== "UNVERIFIED"}
              onClick={() => void saveProfile(true)}
              className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 disabled:opacity-60"
            >
              Verifizierung anfragen
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
        </section>
      ) : null}
    </main>
  );
}
