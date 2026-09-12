#!/usr/bin/env node
/**
 * Production build for the Windows desktop app (Nitro node-server).
 * Leaves the default Vercel preset alone so the web preview still deploys.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const wrapper = join(root, "scripts", "with-app-env.mjs");

const child = spawn(process.execPath, [wrapper, "vite", "build"], {
  cwd: root,
  env: { ...process.env, QUIRE_DESKTOP: "1" },
  stdio: "inherit",
});

child.on("error", (err) => {
  console.error("[desktop-build] failed:", err?.message || err);
  process.exit(127);
});
child.on("exit", (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 1);
});
