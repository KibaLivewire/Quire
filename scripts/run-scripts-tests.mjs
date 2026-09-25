/**
 * Cross-platform entry for npm test scripts leg.
 * Single-quoted globs find 0 files on Windows (no shell expansion).
 * Passing the scripts directory is treated as one module path on Node 24.
 * Explicitly list *.test.mjs under this directory instead.
 */
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(scriptsDir)
  .filter((name) => name.endsWith(".test.mjs"))
  .map((name) => join(scriptsDir, name))
  .sort();

if (files.length === 0) {
  console.error("run-scripts-tests: no *.test.mjs files found in", scriptsDir);
  process.exit(1);
}

const result = spawnSync(process.execPath, ["--test", ...files], {
  stdio: "inherit",
  env: process.env,
});
process.exit(result.status === null ? 1 : result.status);
