import { UserRole, VisibilityStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { parseJsonArray } from "@/lib/json";
import { matchesCompanyFilters, rankCandidatesForCompany } from "@/lib/matching";
import { prisma } from "@/lib/prisma";

function asNumber(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

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
    return NextResponse.json({ error: "Unternehmensprofil nicht gefunden." }, { status: 404 });
  }

  const searchParams = new URL(request.url).searchParams;
  const filters = {
    skills: searchParams
      .get("skills")
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    location: searchParams.get("location") || undefined,
    minExperienceYears: asNumber(searchParams.get("minExperienceYears")),
    minSalary: asNumber(searchParams.get("minSalary")),
    maxSalary: asNumber(searchParams.get("maxSalary")),
    availability: searchParams.get("availability") || undefined,
    query: searchParams.get("query") || undefined,
  };

  const candidates = await prisma.candidateProfile.findMany({
    where: {
      visibility: {
        not: VisibilityStatus.HIDDEN,
      },
    },
  });

  const filtered = candidates.filter((candidate) => matchesCompanyFilters(candidate, filters));
  const ranked = rankCandidatesForCompany(company, filtered, company.jobs);
  const favoriteSet = new Set(
    (
      await prisma.favoriteCandidate.findMany({
        where: { companyProfileId: company.id },
      })
    ).map((favorite) => favorite.candidateProfileId),
  );

  return NextResponse.json({
    results: ranked.map((entry) => ({
      id: entry.candidate.id,
      firstName: entry.candidate.firstName,
      lastName: entry.candidate.lastName,
      location: entry.candidate.location,
      headline: entry.candidate.headline,
      summary: entry.candidate.summary,
      salaryMin: entry.candidate.salaryMin,
      salaryMax: entry.candidate.salaryMax,
      currency: entry.candidate.currency,
      availabilityNote: entry.candidate.availabilityNote,
      experienceYears: entry.candidate.experienceYears,
      visibility: entry.candidate.visibility,
      skills: parseJsonArray<string>(entry.candidate.skillsJson),
      score: entry.score,
      isFavorite: favoriteSet.has(entry.candidate.id),
    })),
  });
}
