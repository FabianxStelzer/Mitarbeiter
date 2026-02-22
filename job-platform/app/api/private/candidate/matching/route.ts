import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { parseJsonArray } from "@/lib/json";
import { rankJobsForCandidate } from "@/lib/matching";
import { prisma } from "@/lib/prisma";

function equalsInsensitive(left: string | null | undefined, right: string | null | undefined): boolean {
  if (!left || !right) {
    return false;
  }
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

export async function GET() {
  const session = await getServerAuthSession();
  if (!session || session.user.role !== UserRole.CANDIDATE) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const candidate = await prisma.candidateProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!candidate) {
    return NextResponse.json({ error: "Kandidatenprofil nicht gefunden." }, { status: 404 });
  }

  const blockedCompanyIds = new Set(parseJsonArray<string>(candidate.blockedCompanyIdsJson));
  const blockedManagerEmails = new Set(
    parseJsonArray<string>(candidate.blockedManagerEmailsJson).map((email) => email.toLowerCase()),
  );

  const jobs = await prisma.jobPosting.findMany({
    where: { active: true },
    include: { company: true },
    orderBy: { createdAt: "desc" },
  });

  const visibleJobs = jobs.filter((job) => {
    if (blockedCompanyIds.has(job.company.id)) {
      return false;
    }

    if (
      job.company.managingDirectorEmail &&
      blockedManagerEmails.has(job.company.managingDirectorEmail.toLowerCase())
    ) {
      return false;
    }

    if (
      candidate.hideFromCurrentEmployer &&
      candidate.currentEmployer &&
      (equalsInsensitive(candidate.currentEmployer, job.company.companyName) ||
        equalsInsensitive(candidate.currentEmployer, job.company.legalName))
    ) {
      return false;
    }

    return true;
  });

  const rankedJobs = rankJobsForCandidate(candidate, visibleJobs).slice(0, 20);
  return NextResponse.json({
    matches: rankedJobs.map((entry) => ({
      jobId: entry.job.id,
      title: entry.job.title,
      companyName: entry.job.company.companyName,
      location: entry.job.location,
      remote: entry.job.isRemote,
      salaryMin: entry.job.salaryMin,
      salaryMax: entry.job.salaryMax,
      currency: entry.job.currency,
      requiredSkills: parseJsonArray<string>(entry.job.requiredSkillsJson),
      score: entry.score,
    })),
  });
}
