#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const args = Object.fromEntries(process.argv.slice(2).map((v,i,a)=>{
  if (v.startsWith("--")) return [v.slice(2), a[i+1] && !a[i+1].startsWith("--") ? a[i+1] : true];
  return [];
}).filter(Boolean));

const outDir = args.out || "artifact";
const root = args.root || ".github/workflows";
const upstreamRef = args.upstream || "upstream/main";
const forkRef = args.fork || "HEAD";

const patchPath = path.join(outDir, "ci-workflow-diff.patch");
const files = fs.readdirSync(outDir).filter(f => f.endsWith(".fixed"));

let patch = "";
for (const f of files) {
  const rel = f.replace(".fixed","");
  const target = path.join(root, rel);
  const fixed = path.join(outDir, f);
  // generate unified diff against current fork HEAD to apply cleanly on PR branch
  fs.writeFileSync(path.join(outDir, rel + ".orig"), execSync(`git show ${forkRef}:${target}`).toString("utf8"));
  const diff = execSync(`diff -u --label ${target} ${path.join(outDir, rel + ".orig")} --label ${target} ${fixed} || true`).toString("utf8");
  patch += diff + "\n";
}

fs.writeFileSync(patchPath, patch.trim() + "\n");

// Minimal console summary
console.log(`Patch written: ${patchPath}`);
