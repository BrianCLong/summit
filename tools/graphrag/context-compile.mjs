#!/usr/bin/env node
import { compileContext, loadJson, saveJson } from "../../packages/graphrag-context-compiler/dist/index.js";

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

const inPath = arg("--in");
const outPath = arg("--out");
const tokenBudget = Number(arg("--token-budget") ?? "1800");

if (!inPath || !outPath) {
  console.error("Usage: context-compile.mjs --in <retrieval.json> --out <compiled.json> [--token-budget N]");
  process.exit(2);
}

const retrieval = loadJson(inPath);
const policy = {
  token_budget: tokenBudget,
  excerpt_chars: 800,
  per_kind_caps: { chunk: 8, entity: 10, claim: 10, doc: 6 }
};

const compiled = compileContext(retrieval, policy);
saveJson(outPath, compiled);
console.log(`wrote ${outPath} context_digest=${compiled.context_digest}`);
