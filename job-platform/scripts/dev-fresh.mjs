#!/usr/bin/env node

import { rmSync } from "node:fs";
import { execSync, spawn } from "node:child_process";

function getPidsOnPort(port) {
  try {
    const output = execSync(`lsof -ti :${port}`, {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    if (!output) {
      return [];
    }

    return output
      .split("\n")
      .map((line) => Number(line.trim()))
      .filter((pid) => Number.isInteger(pid) && pid > 0);
  } catch {
    return [];
  }
}

function getPortDetails(port) {
  try {
    return execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN`, {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function killPids(pids) {
  for (const pid of pids) {
    try {
      process.kill(pid, "SIGKILL");
      console.log(`Prozess ${pid} auf Port 8080 beendet.`);
    } catch {
      // Prozess existiert ggf. nicht mehr – ignorieren.
    }
  }
}

async function waitForPortToBeFree(port, attempts = 12, delayMs = 250) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (!getPidsOnPort(port).length) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return false;
}

function clearNextCache() {
  try {
    rmSync(".next", { recursive: true, force: true });
    console.log(".next Cache gelöscht.");
  } catch {
    // Nicht kritisch.
  }
}

function startDevServer() {
  const child = spawn("next", ["dev", "-p", "8080"], {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

async function main() {
  const pids = getPidsOnPort(8080);
  if (pids.length) {
    killPids(pids);
  } else {
    console.log("Kein belegter Prozess auf Port 8080 gefunden.");
  }

  const isFree = await waitForPortToBeFree(8080);
  if (!isFree) {
    console.error("Port 8080 ist weiterhin belegt. Bitte Prozess manuell beenden.");
    const details = getPortDetails(8080);
    if (details) {
      console.error(details);
    } else {
      console.error("Keine Prozessdetails verfügbar.");
    }
    process.exit(1);
  }

  clearNextCache();
  startDevServer();
}

main();
