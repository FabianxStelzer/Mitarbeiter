import { execSync } from "node:child_process";
import { NextResponse } from "next/server";

function safeGit(command: string): string {
  try {
    return execSync(command, { encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
}

export const runtime = "nodejs";

export async function GET() {
  const commit = safeGit("git rev-parse --short HEAD");
  const branch = safeGit("git branch --show-current");

  return NextResponse.json({
    app: "job-platform",
    commit,
    branch,
    startedAt: new Date().toISOString(),
  });
}
