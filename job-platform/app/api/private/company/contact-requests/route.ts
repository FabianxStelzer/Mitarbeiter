import { ContactStatus, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createContactSchema = z.object({
  candidateProfileId: z.string().min(1),
  message: z.string().min(10).max(2000),
  jobPostingId: z.string().optional(),
});

async function getCompanyProfile(userId: string) {
  return prisma.companyProfile.findUnique({
    where: { userId },
    include: { jobs: true },
  });
}

export async function GET() {
  const session = await getServerAuthSession();
  if (!session || session.user.role !== UserRole.COMPANY) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const company = await getCompanyProfile(session.user.id);
  if (!company) {
    return NextResponse.json({ error: "Unternehmensprofil nicht gefunden." }, { status: 404 });
  }

  const requests = await prisma.contactRequest.findMany({
    where: { companyProfileId: company.id },
    include: { candidate: true, jobPosting: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    requests: requests.map((request) => ({
      id: request.id,
      candidateName: `${request.candidate.firstName} ${request.candidate.lastName}`,
      message: request.message,
      status: request.status,
      createdAt: request.createdAt,
      jobTitle: request.jobPosting?.title ?? null,
    })),
  });
}

export async function POST(request: Request) {
  const session = await getServerAuthSession();
  if (!session || session.user.role !== UserRole.COMPANY) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const company = await getCompanyProfile(session.user.id);
  if (!company) {
    return NextResponse.json({ error: "Unternehmensprofil nicht gefunden." }, { status: 404 });
  }

  const payload = await request.json();
  const parsed = createContactSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
  }

  if (
    parsed.data.jobPostingId &&
    !company.jobs.some((job) => job.id === parsed.data.jobPostingId && job.active)
  ) {
    return NextResponse.json({ error: "Die Stelle ist nicht verfügbar." }, { status: 400 });
  }

  await prisma.contactRequest.create({
    data: {
      companyProfileId: company.id,
      candidateProfileId: parsed.data.candidateProfileId,
      message: parsed.data.message,
      jobPostingId: parsed.data.jobPostingId,
      status: ContactStatus.PENDING,
    },
  });

  return NextResponse.json({ ok: true });
}
