import { UserRole, VisibilityStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { parseJsonArray } from "@/lib/json";
import { rankCandidatesForCompany } from "@/lib/matching";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerAuthSession();
  if (!session || session.user.role !== UserRole.COMPANY) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const company = await prisma.companyProfile.findUnique({
    where: { userId: session.user.id },
    include: { jobs: true },
  });
  if (!company) {
    return NextResponse.json({ error: "Unternehmen nicht gefunden." }, { status: 404 });
  }

  const candidates = await prisma.candidateProfile.findMany({
    where: {
      visibility: {
        not: VisibilityStatus.HIDDEN,
      },
    },
  });

  const matches = rankCandidatesForCompany(company, candidates, company.jobs)
    .filter((entry) => entry.score > 0)
    .slice(0, 20)
    .map((entry) => ({
      candidateId: entry.candidate.id,
      name: `${entry.candidate.firstName} ${entry.candidate.lastName}`,
      headline: entry.candidate.headline,
      location: entry.candidate.location,
      experienceYears: entry.candidate.experienceYears,
      skills: parseJsonArray<string>(entry.candidate.skillsJson),
      score: entry.score,
    }));

  return NextResponse.json({ matches });
}
