import fs from "node:fs";
import path from "node:path";
import { extractFrontMatterJson } from "./extract_frontmatter.mjs";
import { readUtf8, stableStringify, sha256Hex } from "./_lib.mjs";

function loadJson(p) {
  return JSON.parse(readUtf8(p));
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function validateComposition(meta, filePath) {
  assert(meta.composition && Array.isArray(meta.composition.fragments), `PAM: composition.fragments required in ${filePath}`);
  assert(meta.composition.fragments.length > 0, `PAM: composition.fragments empty in ${filePath}`);

  const allowedTypes = new Set(["role", "policy", "tools", "task", "io", "style"]);
  for (const f of meta.composition.fragments) {
    assert(f && typeof f === "object", `PAM: fragment must be object in ${filePath}`);
    assert(allowedTypes.has(f.type), `PAM: fragment type invalid (${String(f.type)}) in ${filePath}`);
    assert(typeof f.path === "string" && f.path.length >= 3, `PAM: fragment path invalid in ${filePath}`);
    assert(fs.existsSync(f.path), `PAM: fragment path not found (${f.path}) referenced by ${filePath}`);
  }
}

function validateBasic(meta, filePath) {
  assert(typeof meta.id === "string" && meta.id.startsWith("prompt."), `PAM: invalid id in ${filePath}`);
  assert(typeof meta.version === "string" && meta.version.split(".").length >= 3, `PAM: invalid version in ${filePath}`);
  assert(typeof meta.name === "string" && meta.name.length >= 3, `PAM: invalid name in ${filePath}`);
  assert(typeof meta.intent === "string" && meta.intent.length >= 10, `PAM: invalid intent in ${filePath}`);

  assert(meta.determinism && meta.determinism.temperature === 0, `PAM: determinism.temperature must be 0 in ${filePath}`);
  assert(meta.determinism.cache_policy, `PAM: determinism.cache_policy required in ${filePath}`);
  assert(meta.determinism.replay_policy, `PAM: determinism.replay_policy required in ${filePath}`);

  assert(meta.outputs && meta.outputs.format, `PAM: outputs.format required in ${filePath}`);
  assert(meta.outputs && meta.outputs.schema && typeof meta.outputs.schema === "object", `PAM: outputs.schema required in ${filePath}`);

  assert(Array.isArray(meta.invariants) && meta.invariants.length > 0, `PAM: invariants required in ${filePath}`);
  for (const inv of meta.invariants) {
    assert(typeof inv.id === "string" && inv.id.startsWith("inv."), `PAM: invariant id must start with inv. in ${filePath}`);
    assert(inv.level === "must" || inv.level === "should", `PAM: invariant level must/should in ${filePath}`);
    assert(typeof inv.assertion === "string" && inv.assertion.length >= 8, `PAM: invariant assertion too short in ${filePath}`);
  }

  // Anti-entropy: ban ambiguous directives in metadata.
  const bannedPhrases = ["use best judgment", "be thorough", "do your best", "as needed"];
  const metaText = stableStringify(meta).toLowerCase();
  for (const phrase of bannedPhrases) {
    assert(!metaText.includes(phrase), `PAM: banned ambiguous phrase "${phrase}" found in metadata of ${filePath}`);
  }

  validateComposition(meta, filePath);
}

function lintRegistry(regPath) {
  const reg = loadJson(regPath);

  // Lightweight validation (schema is referenced but we remain dependency-free here).
  assert(typeof reg.registry_version === "string", "registry.json: missing registry_version");
  assert(Array.isArray(reg.prompts), "registry.json: prompts must be an array");

  const seen = new Set();
  for (const p of reg.prompts) {
    const key = `${p.id}@${p.version}`;
    assert(!seen.has(key), `registry.json: duplicate ${key}`);
    seen.add(key);

    assert(typeof p.path === "string", `registry.json: path missing for ${key}`);
    assert(fs.existsSync(p.path), `registry.json: path not found for ${key}: ${p.path}`);

    const { meta } = extractFrontMatterJson(p.path);

    assert(meta.id === p.id, `registry.json mismatch: ${key} id != front matter id (${meta.id})`);
    assert(meta.version === p.version, `registry.json mismatch: ${key} version != front matter version (${meta.version})`);

    const metaFp = sha256Hex(stableStringify(meta));
    // Not required to be present, but if present must match.
    if (p.meta_fingerprint && p.meta_fingerprint !== metaFp) {
      throw new Error(`registry.json mismatch: meta_fingerprint differs for ${key}`);
    }
  }
}

function main() {
  const regPath = path.normalize("prompts/registry.json");
  lintRegistry(regPath);

  const reg = loadJson(regPath);
  for (const p of reg.prompts) {
    const { meta } = extractFrontMatterJson(p.path);
    validateBasic(meta, p.path);
  }

  process.stdout.write("promptops:lint OK\n");
}

main();
