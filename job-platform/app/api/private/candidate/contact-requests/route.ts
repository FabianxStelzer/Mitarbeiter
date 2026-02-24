import { ContactStatus, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateStatusSchema = z.object({
  requestId: z.string().min(1),
  status: z.enum([ContactStatus.ACCEPTED, ContactStatus.DECLINED]),
});

async function getCandidateId(userId: string) {
  const profile = await prisma.candidateProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  return profile?.id;
}

export async function GET() {
  const session = await getServerAuthSession();
  if (!session || session.user.role !== UserRole.CANDIDATE) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const candidateId = await getCandidateId(session.user.id);
  if (!candidateId) {
    return NextResponse.json({ error: "Kandidatenprofil nicht gefunden." }, { status: 404 });
  }

  const requests = await prisma.contactRequest.findMany({
    where: { candidateProfileId: candidateId },
    include: { company: true, jobPosting: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    requests: requests.map((request) => ({
      id: request.id,
      companyName: request.company.companyName,
      message: request.message,
      status: request.status,
      jobTitle: request.jobPosting?.title ?? null,
      createdAt: request.createdAt,
    })),
  });
}

export async function PATCH(request: Request) {
  const session = await getServerAuthSession();
  if (!session || session.user.role !== UserRole.CANDIDATE) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const candidateId = await getCandidateId(session.user.id);
  if (!candidateId) {
    return NextResponse.json({ error: "Kandidatenprofil nicht gefunden." }, { status: 404 });
  }

  const payload = await request.json();
  const parsed = updateStatusSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
  }

  const updated = await prisma.contactRequest.updateMany({
    where: {
      id: parsed.data.requestId,
      candidateProfileId: candidateId,
    },
    data: {
      status: parsed.data.status,
    },
  });

  if (!updated.count) {
    return NextResponse.json({ error: "Anfrage nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
