#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { compileContext } from "../../../packages/graphrag-context-compiler/dist/index.js";
import { scoreProvenance, scoreCoverage, assertDeterministic } from "./metrics.mjs";

const datasetPath = process.argv[2] ?? "tools/graphrag/eval/datasets/smoke.jsonl";
const lines = fs.readFileSync(datasetPath, "utf8").trim().split("\n");

let failures = 0;
const results = [];

for (const line of lines) {
  if (!line.trim()) continue;
  const item = JSON.parse(line);
  const retrieval = item.retrieval;
  const policy = item.policy;

  const compiled1 = compileContext(retrieval, policy);
  const compiled2 = compileContext(retrieval, policy);

  try {
    assertDeterministic(compiled1, compiled2);
  } catch (e) {
    failures++;
    results.push({ id: item.id, ok: false, reason: "nondeterministic", detail: String(e) });
    continue;
  }

  const prov = scoreProvenance(retrieval);
  const cov = scoreCoverage(retrieval, item.truth ?? null);

  results.push({
    id: item.id,
    ok: true,
    context_digest: compiled1.context_digest,
    provenance: prov,
    coverage: cov,
    output_count: compiled1.evidence_blocks.length
  });
}

fs.mkdirSync("out/graphrag-eval", { recursive: true });
fs.writeFileSync("out/graphrag-eval/results.json", JSON.stringify({ results }, null, 2) + "\n");

if (failures) {
  console.error(`GraphRAG eval failed: ${failures} failing cases`);
  process.exit(1);
}
console.log("GraphRAG eval ok");
