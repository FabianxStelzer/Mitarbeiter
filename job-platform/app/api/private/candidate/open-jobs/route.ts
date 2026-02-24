import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { parseJsonArray } from "@/lib/json";
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
    include: {
      applications: true,
    },
  });
  if (!candidate) {
    return NextResponse.json({ error: "Kandidatenprofil nicht gefunden." }, { status: 404 });
  }

  const blockedCompanyIds = new Set(parseJsonArray<string>(candidate.blockedCompanyIdsJson));
  const blockedManagerEmails = new Set(
    parseJsonArray<string>(candidate.blockedManagerEmailsJson).map((email) => email.toLowerCase()),
  );
  const applicationByJobId = new Map(
    candidate.applications.map((application) => [application.jobPostingId, application]),
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

  return NextResponse.json({
    jobs: visibleJobs.map((job) => {
      const existingApplication = applicationByJobId.get(job.id);
      return {
        id: job.id,
        title: job.title,
        companyName: job.company.companyName,
        companyId: job.company.id,
        location: job.location,
        remote: job.isRemote,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        currency: job.currency,
        requiredSkills: parseJsonArray<string>(job.requiredSkillsJson),
        description: job.description,
        hasApplied: Boolean(existingApplication),
        applicationStage: existingApplication?.stage ?? null,
      };
    }),
  });
}
