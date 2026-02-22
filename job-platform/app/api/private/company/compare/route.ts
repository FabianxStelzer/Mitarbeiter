import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { parseJsonArray } from "@/lib/json";
import { rankCandidatesForCompany } from "@/lib/matching";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
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

  const ids =
    new URL(request.url)
      .searchParams.get("ids")
      ?.split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, 5) ?? [];

  if (!ids.length) {
    return NextResponse.json({ candidates: [] });
  }

  const candidates = await prisma.candidateProfile.findMany({
    where: { id: { in: ids } },
  });
  const ranked = rankCandidatesForCompany(company, candidates, company.jobs);

  return NextResponse.json({
    candidates: ranked.map((entry) => ({
      id: entry.candidate.id,
      name: `${entry.candidate.firstName} ${entry.candidate.lastName}`,
      headline: entry.candidate.headline,
      location: entry.candidate.location,
      experienceYears: entry.candidate.experienceYears,
      salaryMin: entry.candidate.salaryMin,
      salaryMax: entry.candidate.salaryMax,
      currency: entry.candidate.currency,
      availabilityNote: entry.candidate.availabilityNote,
      skills: parseJsonArray<string>(entry.candidate.skillsJson),
      summary: entry.candidate.summary,
      score: entry.score,
    })),
  });
}
