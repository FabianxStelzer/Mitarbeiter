import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { getServerAuthSession } from "@/lib/auth";

export const runtime = "nodejs";

const MAX_SIZE_BYTES = 10 * 1024 * 1024;

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9_.-]/g, "_");
}

export async function POST(request: Request) {
  const session = await getServerAuthSession();
  if (!session || session.user.role !== UserRole.CANDIDATE) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Datei fehlt." }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Datei ist zu groß (max. 10 MB)." },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = sanitizeFileName(file.name);
  const fileName = `${Date.now()}-${safeName}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  const absolutePath = path.join(uploadDir, fileName);
  await writeFile(absolutePath, buffer);

  return NextResponse.json({
    ok: true,
    url: `/uploads/${fileName}`,
    originalName: file.name,
  });
}
