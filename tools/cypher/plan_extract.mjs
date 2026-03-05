#!/usr/bin/env node
import fs from "node:fs";

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}
const inPath = arg("--in");
const outPath = arg("--out");
if (!inPath || !outPath) {
  console.error("Usage: plan_extract.mjs --in <retrieval_results_dir_or_file> --out <plan_summaries.json>");
  process.exit(2);
}

const stat = fs.statSync(inPath);
let files = [];
if (stat.isDirectory()) {
  files = fs.readdirSync(inPath).filter(f => f.endsWith(".json") || f.endsWith(".jsonl")).map(f => `${inPath}/${f}`);
} else {
  files = [inPath];
}

const plans = [];
for (const f of files) {
  const content = fs.readFileSync(f, "utf8");
  if (f.endsWith(".jsonl")) {
    const lines = content.trim().split("\n");
    for (const line of lines) {
      if (!line.trim()) continue;
      const j = JSON.parse(line);
      const arr = j?.retrieval?.stats?.cypher?.plan_summaries ?? j?.stats?.cypher?.plan_summaries ?? [];
      for (const p of arr) plans.push(p);
    }
  } else {
    const j = JSON.parse(content);
    const arr = j?.retrieval?.stats?.cypher?.plan_summaries ?? j?.stats?.cypher?.plan_summaries ?? [];
    for (const p of arr) plans.push(p);
  }
}

plans.sort((a,b) => String(a.query_hash).localeCompare(String(b.query_hash)));
fs.writeFileSync(outPath, JSON.stringify(plans, null, 2) + "\n");
console.log(`wrote ${outPath} plans=${plans.length}`);
