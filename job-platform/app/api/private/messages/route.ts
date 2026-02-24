import { MessageSenderRole, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const sendMessageSchema = z.object({
  threadId: z.string().optional(),
  candidateProfileId: z.string().optional(),
  companyProfileId: z.string().optional(),
  applicationId: z.string().optional(),
  content: z.string().min(1).max(2000),
});

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
      senderRole: MessageSenderRole.CANDIDATE,
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
    senderRole: MessageSenderRole.COMPANY,
  };
}

export async function GET() {
  const session = await getServerAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const actor = await getActor(session.user.id, session.user.role);
  if (!actor.candidateProfileId && !actor.companyProfileId) {
    return NextResponse.json({ error: "Profil nicht gefunden." }, { status: 404 });
  }

  const where =
    actor.role === UserRole.CANDIDATE
      ? { candidateProfileId: actor.candidateProfileId! }
      : { companyProfileId: actor.companyProfileId! };

  const threads = await prisma.messageThread.findMany({
    where,
    include: {
      candidate: true,
      company: true,
      application: {
        include: {
          jobPosting: true,
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const unreadByThread = new Map(
    (
      await Promise.all(
        threads.map(async (thread) => {
          const unread = await prisma.message.count({
            where: {
              threadId: thread.id,
              senderRole:
                actor.role === UserRole.CANDIDATE
                  ? MessageSenderRole.COMPANY
                  : MessageSenderRole.CANDIDATE,
              readAt: null,
            },
          });
          return [thread.id, unread] as const;
        }),
      )
    ).map(([threadId, unread]) => [threadId, unread]),
  );

  return NextResponse.json({
    threads: threads.map((thread) => {
      const latestMessage = thread.messages[0] ?? null;
      return {
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
        latestMessage: latestMessage
          ? {
              id: latestMessage.id,
              content: latestMessage.content,
              senderRole: latestMessage.senderRole,
              createdAt: latestMessage.createdAt,
            }
          : null,
        unreadCount: unreadByThread.get(thread.id) ?? 0,
        updatedAt: thread.updatedAt,
      };
    }),
  });
}

export async function POST(request: Request) {
  const session = await getServerAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const actor = await getActor(session.user.id, session.user.role);
  if (!actor.candidateProfileId && !actor.companyProfileId) {
    return NextResponse.json({ error: "Profil nicht gefunden." }, { status: 404 });
  }

  const payload = await request.json();
  const parsed = sendMessageSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
  }

  const data = parsed.data;
  let thread =
    data.threadId &&
    (await prisma.messageThread.findUnique({
      where: { id: data.threadId },
    }));

  if (thread) {
    const isParticipant =
      (actor.candidateProfileId && thread.candidateProfileId === actor.candidateProfileId) ||
      (actor.companyProfileId && thread.companyProfileId === actor.companyProfileId);
    if (!isParticipant) {
      return NextResponse.json({ error: "Keine Berechtigung für diesen Chat." }, { status: 403 });
    }
  } else {
    let candidateProfileId: string | null = actor.candidateProfileId;
    let companyProfileId: string | null = actor.companyProfileId;

    if (session.user.role === UserRole.CANDIDATE) {
      companyProfileId = data.companyProfileId ?? null;
    } else {
      candidateProfileId = data.candidateProfileId ?? null;
    }

    if (data.applicationId) {
      const application = await prisma.application.findUnique({
        where: { id: data.applicationId },
      });
      if (!application) {
        return NextResponse.json({ error: "Bewerbung nicht gefunden." }, { status: 404 });
      }

      candidateProfileId = candidateProfileId ?? application.candidateProfileId;
      companyProfileId = companyProfileId ?? application.companyProfileId;

      const hasPermission =
        (actor.candidateProfileId && application.candidateProfileId === actor.candidateProfileId) ||
        (actor.companyProfileId && application.companyProfileId === actor.companyProfileId);
      if (!hasPermission) {
        return NextResponse.json({ error: "Keine Berechtigung für diese Bewerbung." }, { status: 403 });
      }

      thread = await prisma.messageThread.findUnique({
        where: { applicationId: application.id },
      });
      if (!thread) {
        thread = await prisma.messageThread.create({
          data: {
            applicationId: application.id,
            candidateProfileId: application.candidateProfileId,
            companyProfileId: application.companyProfileId,
          },
        });
      }
    } else {
      if (!candidateProfileId || !companyProfileId) {
        return NextResponse.json({ error: "Chat-Partner fehlt." }, { status: 400 });
      }

      thread = await prisma.messageThread.findFirst({
        where: {
          candidateProfileId,
          companyProfileId,
          applicationId: null,
        },
      });
      if (!thread) {
        thread = await prisma.messageThread.create({
          data: {
            candidateProfileId,
            companyProfileId,
          },
        });
      }
    }
  }

  const message = await prisma.message.create({
    data: {
      threadId: thread.id,
      senderRole: actor.senderRole,
      senderUserId: session.user.id,
      content: data.content.trim(),
    },
  });

  return NextResponse.json({
    ok: true,
    threadId: thread.id,
    messageId: message.id,
  });
}
