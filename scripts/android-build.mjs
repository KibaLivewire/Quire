#!/usr/bin/env node
/**
 * Static web build for the Android Capacitor shell.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const wrapper = join(root, "scripts", "with-app-env.mjs");
const dest = join(root, "android-www");

function run(cmd, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: root, env, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

await run(process.execPath, [wrapper, "vite", "build"], {
  ...process.env,
  QUIRE_ANDROID: "1",
}).catch((error) => {
  const html = join(root, ".output", "public", "index.html");
  if (!existsSync(html)) throw error;
  console.warn("[android-build] Vite reported an error after prerender; using .output/public anyway.");
});

const publicDir = join(root, ".output", "public");
if (!existsSync(publicDir)) {
  throw new Error("Android web build did not produce .output/public");
}
rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(publicDir, dest, { recursive: true });

await run("npx", ["cap", "sync", "android"], process.env);
console.log("[android-build] synced into android/");
