import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import {
  ApplicationStage,
  MessageSenderRole,
  PrismaClient,
  UserRole,
  VerificationStatus,
  VisibilityStatus,
} from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL ist nicht gesetzt.");
}

const adapter = new PrismaBetterSqlite3({
  url: databaseUrl,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const candidatePasswordHash = await bcrypt.hash("Kandidat123!", 12);
  const companyPasswordHash = await bcrypt.hash("Unternehmen123!", 12);

  const candidateUser = await prisma.user.upsert({
    where: { email: "kandidat@demo.de" },
    update: {},
    create: {
      email: "kandidat@demo.de",
      passwordHash: candidatePasswordHash,
      role: UserRole.CANDIDATE,
    },
  });

  const companyUser = await prisma.user.upsert({
    where: { email: "hr@demo-gmbh.de" },
    update: {},
    create: {
      email: "hr@demo-gmbh.de",
      passwordHash: companyPasswordHash,
      role: UserRole.COMPANY,
    },
  });

  const candidateProfile = await prisma.candidateProfile.upsert({
    where: { userId: candidateUser.id },
    update: {},
    create: {
      userId: candidateUser.id,
      firstName: "Mina",
      lastName: "Mustermann",
      location: "Berlin",
      headline: "Senior Fullstack Entwicklerin",
      summary: "8 Jahre Erfahrung mit TypeScript, React, Node.js und Cloud-Deployments.",
      visibility: VisibilityStatus.ACTIVE_SEARCH,
      salaryMin: 70000,
      salaryMax: 90000,
      availabilityNote: "Ab 01.05.2026",
      availableFrom: new Date("2026-05-01"),
      experienceYears: 8,
      skillsJson: JSON.stringify(["TypeScript", "React", "Node.js", "PostgreSQL", "AWS"]),
      experiencesJson: JSON.stringify([
        {
          company: "CloudSoft AG",
          title: "Senior Fullstack Entwicklerin",
          start: "2021-01",
          end: null,
          description: "Verantwortung für skalierbare Recruiting- und HR-Produkte.",
        },
      ]),
      educationsJson: JSON.stringify([
        {
          institution: "TU Berlin",
          degree: "M.Sc. Informatik",
          startYear: 2014,
          endYear: 2016,
        },
      ]),
      certificatesJson: JSON.stringify([
        {
          name: "AWS Certified Developer",
          issuer: "Amazon",
          year: 2024,
        },
      ]),
      portfolioJson: JSON.stringify([
        {
          title: "Recruiting Dashboard",
          url: "https://portfolio.demo/recruiting-dashboard",
          description: "Analyse- und Matching-Dashboard mit Echtzeitfiltern.",
        },
      ]),
      preferredLocationsJson: JSON.stringify(["Berlin", "Remote"]),
      preferredEmploymentTypesJson: JSON.stringify(["Vollzeit", "Hybrid"]),
      gdprConsentAt: new Date(),
    },
  });

  const companyProfile = await prisma.companyProfile.upsert({
    where: { userId: companyUser.id },
    update: {},
    create: {
      userId: companyUser.id,
      companyName: "Demo GmbH",
      legalName: "Demo GmbH",
      location: "Berlin",
      industry: "SaaS",
      website: "https://demo-gmbh.de",
      description: "Wir entwickeln digitale Plattformen für HR und Recruiting.",
      verificationStatus: VerificationStatus.VERIFIED,
      managingDirectorEmail: "ceo@demo-gmbh.de",
      employeeCount: 150,
    },
  });

  const mainJob = await prisma.jobPosting.upsert({
    where: {
      id: "demo-job-fullstack-1",
    },
    update: {},
    create: {
      id: "demo-job-fullstack-1",
      companyProfileId: companyProfile.id,
      title: "Senior Fullstack Engineer (m/w/d)",
      description: "Aufbau einer skalierbaren Matching-Plattform mit Next.js und Node.js.",
      location: "Berlin",
      isRemote: true,
      salaryMin: 75000,
      salaryMax: 95000,
      minExperienceYears: 5,
      requiredSkillsJson: JSON.stringify(["TypeScript", "React", "Node.js"]),
      preferredSkillsJson: JSON.stringify(["Prisma", "AWS"]),
      availabilityNote: "Start innerhalb der nächsten 3 Monate",
      active: true,
    },
  });

  await prisma.jobPosting.upsert({
    where: {
      id: "demo-job-product-1",
    },
    update: {},
    create: {
      id: "demo-job-product-1",
      companyProfileId: companyProfile.id,
      title: "Product Manager (m/w/d)",
      description: "Weiterentwicklung einer modernen Bewerbungsplattform.",
      location: "Hamburg",
      isRemote: true,
      salaryMin: 68000,
      salaryMax: 86000,
      minExperienceYears: 3,
      requiredSkillsJson: JSON.stringify(["Product Management", "Agile", "Stakeholder Management"]),
      preferredSkillsJson: JSON.stringify(["SaaS", "B2B", "Analytics"]),
      availabilityNote: "Start innerhalb von 2 Monaten",
      active: true,
    },
  });

  await prisma.favoriteCandidate.upsert({
    where: {
      companyProfileId_candidateProfileId: {
        companyProfileId: companyProfile.id,
        candidateProfileId: candidateProfile.id,
      },
    },
    update: {},
    create: {
      companyProfileId: companyProfile.id,
      candidateProfileId: candidateProfile.id,
    },
  });

  const application = await prisma.application.upsert({
    where: {
      candidateProfileId_jobPostingId: {
        candidateProfileId: candidateProfile.id,
        jobPostingId: mainJob.id,
      },
    },
    update: {
      stage: ApplicationStage.INTERVIEWS,
    },
    create: {
      candidateProfileId: candidateProfile.id,
      companyProfileId: companyProfile.id,
      jobPostingId: mainJob.id,
      stage: ApplicationStage.INTERVIEWS,
    },
  });

  const thread = await prisma.messageThread.upsert({
    where: {
      applicationId: application.id,
    },
    update: {},
    create: {
      applicationId: application.id,
      candidateProfileId: candidateProfile.id,
      companyProfileId: companyProfile.id,
    },
  });

  const existingMessages = await prisma.message.count({
    where: {
      threadId: thread.id,
    },
  });

  if (!existingMessages) {
    await prisma.message.createMany({
      data: [
        {
          threadId: thread.id,
          senderRole: MessageSenderRole.COMPANY,
          senderUserId: companyUser.id,
          content: "Hallo Mina, danke für deine Bewerbung. Wir würden dich gerne zum Interview einladen.",
        },
        {
          threadId: thread.id,
          senderRole: MessageSenderRole.CANDIDATE,
          senderUserId: candidateUser.id,
          content: "Danke für die Einladung. Ich freue mich auf den Termin!",
        },
      ],
    });
  }

  console.log("Seed erfolgreich ausgeführt.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
