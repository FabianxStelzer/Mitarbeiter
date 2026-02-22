import { ApplicationStage, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateStageSchema = z.object({
  applicationId: z.string().min(1),
  stage: z.enum([
    ApplicationStage.APPLIED,
    ApplicationStage.INVITED,
    ApplicationStage.INTERVIEWS,
    ApplicationStage.HIRED,
    ApplicationStage.REJECTED,
  ]),
});

export async function GET() {
  const session = await getServerAuthSession();
  if (!session || session.user.role !== UserRole.COMPANY) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const company = await prisma.companyProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!company) {
    return NextResponse.json({ error: "Unternehmensprofil nicht gefunden." }, { status: 404 });
  }

  const applications = await prisma.application.findMany({
    where: { companyProfileId: company.id },
    include: {
      candidate: true,
      jobPosting: true,
      thread: {
        select: {
          id: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({
    applications: applications.map((application) => ({
      id: application.id,
      stage: application.stage,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      candidateId: application.candidate.id,
      candidateName: `${application.candidate.firstName} ${application.candidate.lastName}`,
      candidateAvatarUrl: application.candidate.avatarUrl,
      candidateHeadline: application.candidate.headline,
      candidateLocation: application.candidate.location,
      jobId: application.jobPosting.id,
      jobTitle: application.jobPosting.title,
      threadId: application.thread?.id ?? null,
    })),
  });
}

export async function PATCH(request: Request) {
  const session = await getServerAuthSession();
  if (!session || session.user.role !== UserRole.COMPANY) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const company = await prisma.companyProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!company) {
    return NextResponse.json({ error: "Unternehmensprofil nicht gefunden." }, { status: 404 });
  }

  const payload = await request.json();
  const parsed = updateStageSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
  }

  const updated = await prisma.application.updateMany({
    where: {
      id: parsed.data.applicationId,
      companyProfileId: company.id,
    },
    data: {
      stage: parsed.data.stage,
    },
  });

  if (!updated.count) {
    return NextResponse.json({ error: "Bewerbung nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
