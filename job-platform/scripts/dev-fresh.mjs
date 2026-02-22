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

const pids = getPidsOnPort(8080);
if (pids.length) {
  killPids(pids);
} else {
  console.log("Kein belegter Prozess auf Port 8080 gefunden.");
}

clearNextCache();
startDevServer();
