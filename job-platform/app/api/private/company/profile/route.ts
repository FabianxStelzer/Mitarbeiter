import { UserRole, VerificationStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const companyProfileSchema = z.object({
  companyName: z.string().min(1),
  legalName: z.string().optional(),
  location: z.string().optional(),
  industry: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  description: z.string().optional(),
  managingDirectorEmail: z.email().optional().or(z.literal("")),
  employeeCount: z.number().int().min(1).nullable().optional(),
  requestVerification: z.boolean().optional(),
});

export async function GET() {
  const session = await getServerAuthSession();
  if (!session || session.user.role !== UserRole.COMPANY) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const profile = await prisma.companyProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) {
    return NextResponse.json({ error: "Profil nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json({ profile });
}

export async function PUT(request: Request) {
  const session = await getServerAuthSession();
  if (!session || session.user.role !== UserRole.COMPANY) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = companyProfileSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige Eingaben.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const existing = await prisma.companyProfile.findUnique({
    where: { userId: session.user.id },
  });

  const nextVerificationStatus =
    data.requestVerification && existing?.verificationStatus === VerificationStatus.UNVERIFIED
      ? VerificationStatus.PENDING
      : existing?.verificationStatus ?? VerificationStatus.UNVERIFIED;

  const profile = await prisma.companyProfile.upsert({
    where: { userId: session.user.id },
    update: {
      companyName: data.companyName.trim(),
      legalName: data.legalName?.trim() || null,
      location: data.location?.trim() || null,
      industry: data.industry?.trim() || null,
      website: data.website?.trim() || null,
      description: data.description?.trim() || null,
      managingDirectorEmail: data.managingDirectorEmail?.trim().toLowerCase() || null,
      employeeCount: data.employeeCount ?? null,
      verificationStatus: nextVerificationStatus,
    },
    create: {
      userId: session.user.id,
      companyName: data.companyName.trim(),
      legalName: data.legalName?.trim() || null,
      location: data.location?.trim() || null,
      industry: data.industry?.trim() || null,
      website: data.website?.trim() || null,
      description: data.description?.trim() || null,
      managingDirectorEmail: data.managingDirectorEmail?.trim().toLowerCase() || null,
      employeeCount: data.employeeCount ?? null,
      verificationStatus: nextVerificationStatus,
    },
  });

  return NextResponse.json({ ok: true, profile });
}
