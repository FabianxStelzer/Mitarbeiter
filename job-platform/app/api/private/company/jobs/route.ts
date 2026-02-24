import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerAuthSession } from "@/lib/auth";
import { parseJsonArray, safeJsonStringify } from "@/lib/json";
import { prisma } from "@/lib/prisma";

const jobSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  location: z.string().optional(),
  isRemote: z.boolean(),
  salaryMin: z.number().int().nullable().optional(),
  salaryMax: z.number().int().nullable().optional(),
  currency: z.string().optional(),
  minExperienceYears: z.number().int().min(0),
  requiredSkills: z.array(z.string()).default([]),
  preferredSkills: z.array(z.string()).default([]),
  availabilityNote: z.string().optional(),
  active: z.boolean().default(true),
});

function cleanList(list: string[]) {
  return list.map((item) => item.trim()).filter(Boolean);
}

async function getCompanyId(userId: string) {
  const company = await prisma.companyProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  return company?.id;
}

export async function GET() {
  const session = await getServerAuthSession();
  if (!session || session.user.role !== UserRole.COMPANY) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const companyId = await getCompanyId(session.user.id);
  if (!companyId) {
    return NextResponse.json({ error: "Unternehmen nicht gefunden." }, { status: 404 });
  }

  const jobs = await prisma.jobPosting.findMany({
    where: { companyProfileId: companyId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    jobs: jobs.map((job) => ({
      ...job,
      requiredSkills: parseJsonArray<string>(job.requiredSkillsJson),
      preferredSkills: parseJsonArray<string>(job.preferredSkillsJson),
    })),
  });
}

export async function POST(request: Request) {
  const session = await getServerAuthSession();
  if (!session || session.user.role !== UserRole.COMPANY) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const companyId = await getCompanyId(session.user.id);
  if (!companyId) {
    return NextResponse.json({ error: "Unternehmen nicht gefunden." }, { status: 404 });
  }

  const payload = await request.json();
  const parsed = jobSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingaben." }, { status: 400 });
  }

  const data = parsed.data;
  const job = await prisma.jobPosting.create({
    data: {
      companyProfileId: companyId,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      location: data.location?.trim() || null,
      isRemote: data.isRemote,
      salaryMin: data.salaryMin ?? null,
      salaryMax: data.salaryMax ?? null,
      currency: data.currency?.trim() || "EUR",
      minExperienceYears: data.minExperienceYears,
      requiredSkillsJson: safeJsonStringify(cleanList(data.requiredSkills)),
      preferredSkillsJson: safeJsonStringify(cleanList(data.preferredSkills)),
      availabilityNote: data.availabilityNote?.trim() || null,
      active: data.active,
    },
  });

  return NextResponse.json({ ok: true, jobId: job.id });
}
