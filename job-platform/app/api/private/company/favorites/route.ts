import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerAuthSession } from "@/lib/auth";
import { parseJsonArray } from "@/lib/json";
import { prisma } from "@/lib/prisma";

const favoriteSchema = z.object({
  candidateProfileId: z.string().min(1),
});

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
    return NextResponse.json({ error: "Unternehmensprofil nicht gefunden." }, { status: 404 });
  }

  const favorites = await prisma.favoriteCandidate.findMany({
    where: { companyProfileId: companyId },
    include: { candidate: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    favorites: favorites.map((favorite) => ({
      id: favorite.id,
      candidateId: favorite.candidate.id,
      name: `${favorite.candidate.firstName} ${favorite.candidate.lastName}`,
      headline: favorite.candidate.headline,
      location: favorite.candidate.location,
      experienceYears: favorite.candidate.experienceYears,
      skills: parseJsonArray<string>(favorite.candidate.skillsJson),
      scoreHint: favorite.candidate.visibility,
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
    return NextResponse.json({ error: "Unternehmensprofil nicht gefunden." }, { status: 404 });
  }

  const payload = await request.json();
  const parsed = favoriteSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
  }

  try {
    await prisma.favoriteCandidate.create({
      data: {
        companyProfileId: companyId,
        candidateProfileId: parsed.data.candidateProfileId,
      },
    });
  } catch {
    // Favorit existiert bereits, wir ignorieren den Fehler bewusst.
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await getServerAuthSession();
  if (!session || session.user.role !== UserRole.COMPANY) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const companyId = await getCompanyId(session.user.id);
  if (!companyId) {
    return NextResponse.json({ error: "Unternehmensprofil nicht gefunden." }, { status: 404 });
  }

  const payload = await request.json();
  const parsed = favoriteSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
  }

  await prisma.favoriteCandidate.deleteMany({
    where: {
      companyProfileId: companyId,
      candidateProfileId: parsed.data.candidateProfileId,
    },
  });

  return NextResponse.json({ ok: true });
}
