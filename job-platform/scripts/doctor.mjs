#!/usr/bin/env node

import { execSync } from "node:child_process";

function run(command, options = { allowFailure: false }) {
  try {
    return execSync(command, {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    if (options.allowFailure) {
      return "";
    }

    if (error instanceof Error) {
      return `FEHLER: ${error.message}`;
    }
    return "FEHLER: Unbekannter Fehler";
  }
}

console.log("=== Diagnose: Bewerbungsplattform ===");
console.log(`Commit: ${run("git rev-parse --short HEAD")}`);
console.log(`Branch: ${run("git branch --show-current")}`);
console.log(`Node:   ${run("node -v")}`);
console.log("");
console.log("Port 8080 Listener:");
const listeners = run("lsof -nP -iTCP:8080 -sTCP:LISTEN", { allowFailure: true });
console.log(listeners || "keine");
console.log("");
console.log("API-Version (falls Server läuft):");
const apiVersion = run("curl -sf http://localhost:8080/api/version", { allowFailure: true });
console.log(apiVersion || "nicht erreichbar");
