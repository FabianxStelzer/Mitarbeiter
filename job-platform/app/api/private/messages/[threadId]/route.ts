import { MessageSenderRole, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getActor(userId: string, role: UserRole) {
  if (role === UserRole.CANDIDATE) {
    const candidate = await prisma.candidateProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    return {
      role,
      candidateProfileId: candidate?.id ?? null,
      companyProfileId: null,
    };
  }

  const company = await prisma.companyProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  return {
    role,
    candidateProfileId: null,
    companyProfileId: company?.id ?? null,
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ threadId: string }> },
) {
  const session = await getServerAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const actor = await getActor(session.user.id, session.user.role);
  if (!actor.candidateProfileId && !actor.companyProfileId) {
    return NextResponse.json({ error: "Profil nicht gefunden." }, { status: 404 });
  }

  const { threadId } = await context.params;
  const thread = await prisma.messageThread.findUnique({
    where: { id: threadId },
    include: {
      candidate: true,
      company: true,
      application: {
        include: {
          jobPosting: true,
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!thread) {
    return NextResponse.json({ error: "Chat nicht gefunden." }, { status: 404 });
  }

  const isParticipant =
    (actor.candidateProfileId && thread.candidateProfileId === actor.candidateProfileId) ||
    (actor.companyProfileId && thread.companyProfileId === actor.companyProfileId);
  if (!isParticipant) {
    return NextResponse.json({ error: "Keine Berechtigung für diesen Chat." }, { status: 403 });
  }

  await prisma.message.updateMany({
    where: {
      threadId,
      senderRole:
        session.user.role === UserRole.CANDIDATE
          ? MessageSenderRole.COMPANY
          : MessageSenderRole.CANDIDATE,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  return NextResponse.json({
    thread: {
      id: thread.id,
      applicationId: thread.applicationId,
      jobTitle: thread.application?.jobPosting.title ?? null,
      company: {
        id: thread.company.id,
        name: thread.company.companyName,
      },
      candidate: {
        id: thread.candidate.id,
        name: `${thread.candidate.firstName} ${thread.candidate.lastName}`,
        avatarUrl: thread.candidate.avatarUrl,
      },
    },
    messages: thread.messages.map((message) => ({
      id: message.id,
      senderRole: message.senderRole,
      content: message.content,
      createdAt: message.createdAt,
      readAt: message.readAt,
    })),
  });
}
