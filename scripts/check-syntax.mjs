#!/usr/bin/env node
/**
 * Zero-dependency syntax check (`node --check`) over every JavaScript module in the repo.
 * Mirrors what a TypeScript `tsc --noEmit` step would catch for plain ESM, without adding a
 * toolchain that the project does not otherwise need.
 */

import { readdir } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

const ROOTS = ["src", "scripts", "test"];
const files = [];

async function walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full);
    else if (entry.isFile() && /\.(mjs|js)$/.test(entry.name)) files.push(full);
  }
}

for (const root of ROOTS) await walk(root);
files.sort();

let failures = 0;
for (const file of files) {
  const res = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (res.status === 0) {
    console.log(`ok   ${file}`);
  } else {
    failures += 1;
    console.error(`FAIL ${file}\n${res.stderr}`);
  }
}

console.log(`\n${files.length - failures}/${files.length} files passed syntax check.`);
process.exit(failures === 0 ? 0 : 1);
