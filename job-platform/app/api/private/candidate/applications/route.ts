import { ApplicationStage, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createApplicationSchema = z.object({
  jobPostingId: z.string().min(1),
});

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

  const applications = await prisma.application.findMany({
    where: { candidateProfileId: candidate.id },
    include: {
      company: true,
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
      companyName: application.company.companyName,
      companyId: application.company.id,
      jobTitle: application.jobPosting.title,
      jobId: application.jobPosting.id,
      threadId: application.thread?.id ?? null,
    })),
  });
}

export async function POST(request: Request) {
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

  const payload = await request.json();
  const parsed = createApplicationSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
  }

  const job = await prisma.jobPosting.findUnique({
    where: { id: parsed.data.jobPostingId },
    include: { company: true },
  });
  if (!job || !job.active) {
    return NextResponse.json({ error: "Stelle nicht gefunden oder inaktiv." }, { status: 404 });
  }

  const existing = await prisma.application.findUnique({
    where: {
      candidateProfileId_jobPostingId: {
        candidateProfileId: candidate.id,
        jobPostingId: job.id,
      },
    },
    include: {
      thread: true,
    },
  });

  if (existing) {
    return NextResponse.json({
      ok: true,
      applicationId: existing.id,
      stage: existing.stage,
      threadId: existing.thread?.id ?? null,
      existing: true,
    });
  }

  const created = await prisma.$transaction(async (tx) => {
    const application = await tx.application.create({
      data: {
        candidateProfileId: candidate.id,
        companyProfileId: job.company.id,
        jobPostingId: job.id,
        stage: ApplicationStage.APPLIED,
      },
    });

    const thread = await tx.messageThread.create({
      data: {
        candidateProfileId: candidate.id,
        companyProfileId: job.company.id,
        applicationId: application.id,
      },
      select: { id: true },
    });

    return { application, thread };
  });

  return NextResponse.json({
    ok: true,
    applicationId: created.application.id,
    stage: created.application.stage,
    threadId: created.thread.id,
    existing: false,
  });
}
