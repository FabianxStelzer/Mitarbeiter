import { UserRole, VisibilityStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerAuthSession } from "@/lib/auth";
import { parseJsonArray, safeJsonStringify } from "@/lib/json";
import { prisma } from "@/lib/prisma";

const experienceSchema = z.object({
  company: z.string().min(1),
  title: z.string().min(1),
  start: z.string().optional(),
  end: z.string().nullable().optional(),
  description: z.string().optional(),
});

const educationSchema = z.object({
  institution: z.string().min(1),
  degree: z.string().min(1),
  field: z.string().optional(),
  startYear: z.number().int().optional(),
  endYear: z.number().int().optional(),
});

const certificateSchema = z.object({
  name: z.string().min(1),
  issuer: z.string().optional(),
  year: z.number().int().optional(),
  url: z.string().url().optional(),
});

const portfolioSchema = z.object({
  title: z.string().min(1),
  url: z.string().optional(),
  description: z.string().optional(),
  type: z.enum(["link", "file"]).optional(),
});

const candidateProfileSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  avatarUrl: z.string().optional(),
  location: z.string().optional(),
  headline: z.string().optional(),
  summary: z.string().optional(),
  currentEmployer: z.string().optional(),
  hideFromCurrentEmployer: z.boolean(),
  visibility: z.enum([
    VisibilityStatus.ACTIVE_SEARCH,
    VisibilityStatus.OPEN_TO_OFFERS,
    VisibilityStatus.HIDDEN,
  ]),
  salaryMin: z.number().int().nullable().optional(),
  salaryMax: z.number().int().nullable().optional(),
  currency: z.string().min(3).max(5).optional(),
  availableFrom: z.string().datetime().nullable().optional(),
  availabilityNote: z.string().optional(),
  experienceYears: z.number().int().min(0),
  skills: z.array(z.string()).default([]),
  experiences: z.array(experienceSchema).default([]),
  educations: z.array(educationSchema).default([]),
  certificates: z.array(certificateSchema).default([]),
  portfolio: z.array(portfolioSchema).default([]),
  preferredLocations: z.array(z.string()).default([]),
  preferredEmploymentTypes: z.array(z.string()).default([]),
  blockedCompanyIds: z.array(z.string()).default([]),
  blockedManagerEmails: z.array(z.string()).default([]),
});

function cleanList(list: string[]) {
  return list.map((item) => item.trim()).filter(Boolean);
}

export async function GET() {
  const session = await getServerAuthSession();
  if (!session || session.user.role !== UserRole.CANDIDATE) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profil nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json({
    profile: {
      ...profile,
      skills: parseJsonArray<string>(profile.skillsJson),
      experiences: parseJsonArray<unknown>(profile.experiencesJson),
      educations: parseJsonArray<unknown>(profile.educationsJson),
      certificates: parseJsonArray<unknown>(profile.certificatesJson),
      portfolio: parseJsonArray<unknown>(profile.portfolioJson),
      preferredLocations: parseJsonArray<string>(profile.preferredLocationsJson),
      preferredEmploymentTypes: parseJsonArray<string>(profile.preferredEmploymentTypesJson),
      blockedCompanyIds: parseJsonArray<string>(profile.blockedCompanyIdsJson),
      blockedManagerEmails: parseJsonArray<string>(profile.blockedManagerEmailsJson),
    },
  });
}

export async function PUT(request: Request) {
  const session = await getServerAuthSession();
  if (!session || session.user.role !== UserRole.CANDIDATE) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = candidateProfileSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige Eingaben.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const profile = await prisma.candidateProfile.upsert({
    where: { userId: session.user.id },
    update: {
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      phone: data.phone?.trim() || null,
      avatarUrl: data.avatarUrl?.trim() || null,
      location: data.location?.trim() || null,
      headline: data.headline?.trim() || null,
      summary: data.summary?.trim() || null,
      currentEmployer: data.currentEmployer?.trim() || null,
      hideFromCurrentEmployer: data.hideFromCurrentEmployer,
      visibility: data.visibility,
      salaryMin: data.salaryMin ?? null,
      salaryMax: data.salaryMax ?? null,
      currency: data.currency?.trim() || "EUR",
      availableFrom: data.availableFrom ? new Date(data.availableFrom) : null,
      availabilityNote: data.availabilityNote?.trim() || null,
      experienceYears: data.experienceYears,
      skillsJson: safeJsonStringify(cleanList(data.skills)),
      experiencesJson: safeJsonStringify(data.experiences),
      educationsJson: safeJsonStringify(data.educations),
      certificatesJson: safeJsonStringify(data.certificates),
      portfolioJson: safeJsonStringify(data.portfolio),
      preferredLocationsJson: safeJsonStringify(cleanList(data.preferredLocations)),
      preferredEmploymentTypesJson: safeJsonStringify(cleanList(data.preferredEmploymentTypes)),
      blockedCompanyIdsJson: safeJsonStringify(cleanList(data.blockedCompanyIds)),
      blockedManagerEmailsJson: safeJsonStringify(
        cleanList(data.blockedManagerEmails.map((entry) => entry.toLowerCase())),
      ),
      gdprConsentAt: new Date(),
    },
    create: {
      userId: session.user.id,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      phone: data.phone?.trim() || null,
      avatarUrl: data.avatarUrl?.trim() || null,
      location: data.location?.trim() || null,
      headline: data.headline?.trim() || null,
      summary: data.summary?.trim() || null,
      currentEmployer: data.currentEmployer?.trim() || null,
      hideFromCurrentEmployer: data.hideFromCurrentEmployer,
      visibility: data.visibility,
      salaryMin: data.salaryMin ?? null,
      salaryMax: data.salaryMax ?? null,
      currency: data.currency?.trim() || "EUR",
      availableFrom: data.availableFrom ? new Date(data.availableFrom) : null,
      availabilityNote: data.availabilityNote?.trim() || null,
      experienceYears: data.experienceYears,
      skillsJson: safeJsonStringify(cleanList(data.skills)),
      experiencesJson: safeJsonStringify(data.experiences),
      educationsJson: safeJsonStringify(data.educations),
      certificatesJson: safeJsonStringify(data.certificates),
      portfolioJson: safeJsonStringify(data.portfolio),
      preferredLocationsJson: safeJsonStringify(cleanList(data.preferredLocations)),
      preferredEmploymentTypesJson: safeJsonStringify(cleanList(data.preferredEmploymentTypes)),
      blockedCompanyIdsJson: safeJsonStringify(cleanList(data.blockedCompanyIds)),
      blockedManagerEmailsJson: safeJsonStringify(
        cleanList(data.blockedManagerEmails.map((entry) => entry.toLowerCase())),
      ),
      gdprConsentAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, id: profile.id });
}
