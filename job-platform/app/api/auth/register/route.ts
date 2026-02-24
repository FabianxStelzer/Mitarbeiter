import { UserRole } from "@prisma/client";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const registerSchema = z
  .object({
    email: z.email("Ungültige E-Mail-Adresse."),
    password: z
      .string()
      .min(8, "Passwort muss mindestens 8 Zeichen lang sein.")
      .regex(/[A-Z]/, "Passwort muss mindestens einen Großbuchstaben enthalten.")
      .regex(/[0-9]/, "Passwort muss mindestens eine Zahl enthalten."),
    role: z.enum([UserRole.CANDIDATE, UserRole.COMPANY]),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    companyName: z.string().optional(),
    gdprConsent: z.boolean(),
  })
  .superRefine((data, context) => {
    if (!data.gdprConsent) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["gdprConsent"],
        message: "Du musst der Datenverarbeitung zustimmen.",
      });
    }

    if (data.role === UserRole.CANDIDATE) {
      if (!data.firstName?.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["firstName"],
          message: "Vorname ist erforderlich.",
        });
      }

      if (!data.lastName?.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["lastName"],
          message: "Nachname ist erforderlich.",
        });
      }
    }

    if (data.role === UserRole.COMPANY && !data.companyName?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["companyName"],
        message: "Unternehmensname ist erforderlich.",
      });
    }
  });

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = registerSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ungültige Eingaben.", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (existingUser) {
      return NextResponse.json({ error: "E-Mail ist bereits registriert." }, { status: 409 });
    }

    const passwordHash = await hash(data.password, 12);

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email.toLowerCase(),
          passwordHash,
          role: data.role,
        },
      });

      if (data.role === UserRole.CANDIDATE) {
        await tx.candidateProfile.create({
          data: {
            userId: user.id,
            firstName: data.firstName!.trim(),
            lastName: data.lastName!.trim(),
            gdprConsentAt: new Date(),
          },
        });
      } else {
        await tx.companyProfile.create({
          data: {
            userId: user.id,
            companyName: data.companyName!.trim(),
          },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Registrierung fehlgeschlagen:", error);
    return NextResponse.json({ error: "Registrierung fehlgeschlagen." }, { status: 500 });
  }
}
