// scripts/ci/verify_subsumption_bundle.mjs
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import yaml from "js-yaml";

function fail(msg, code = 2) {
  console.error(msg);
  process.exit(code);
}

function readText(p) {
  return fs.readFileSync(p, "utf8");
}

function isTruthy(value) {
  return value !== null && value !== undefined;
}

function resolvePath(repoRoot, p) {
  if (!p) return null;
  return path.isAbsolute(p) ? p : path.join(repoRoot, p);
}

function stableStringify(obj) {
  const allKeys = [];
  JSON.stringify(obj, (k, v) => {
    allKeys.push(k);
    return v;
  });
  allKeys.sort();
  return `${JSON.stringify(obj, allKeys, 2)}\n`;
}

function writeDeterministicJson(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, stableStringify(obj), "utf8");
}

function parseManifest(manifestPath) {
  const raw = readText(manifestPath);
  try {
    return yaml.load(raw);
  } catch (err) {
    fail(`Manifest YAML parse failed: ${err.message}`);
  }
}

function loadEvidenceIndex(evidenceIndexPath, failures) {
  if (!evidenceIndexPath || !fs.existsSync(evidenceIndexPath)) return null;
  try {
    return JSON.parse(readText(evidenceIndexPath));
  } catch {
    failures.push(`Evidence index is not valid JSON: ${evidenceIndexPath}`);
    return null;
  }
}

function getDocsTargets(manifest) {
  if (Array.isArray(manifest?.docs_targets)) return manifest.docs_targets;
  if (Array.isArray(manifest?.docs)) return manifest.docs;
  if (Array.isArray(manifest?.docs?.required)) return manifest.docs.required;
  if (Array.isArray(manifest?.docs?.targets)) return manifest.docs.targets;
  return [];
}

function getRequiredEvidenceIds(manifest) {
  if (Array.isArray(manifest?.evidence?.required_ids)) return manifest.evidence.required_ids;
  if (Array.isArray(manifest?.evidence_ids)) return manifest.evidence_ids;
  return [];
}

function getEvidenceSchemas(manifest) {
  if (manifest?.evidence?.schemas) return manifest.evidence.schemas;
  return {
    report: "evidence/schemas/report.schema.json",
    metrics: "evidence/schemas/metrics.schema.json",
    stamp: "evidence/schemas/stamp.schema.json",
  };
}

function getEvidenceIndexPath(manifest) {
  return manifest?.evidence?.index || "evidence/index.json";
}

function shouldRequireDenyFixture(manifest, bundleDir) {
  if (manifest?.fixtures?.deny_policy_dir) return true;
  if (Array.isArray(manifest?.gates)) {
    return manifest.gates.some((gate) => gate?.deny_by_default_required === true);
  }
  const legacyDenyDir = path.join(bundleDir, "fixtures", "deny");
  const policyDenyDir = path.join(bundleDir, "fixtures", "policy", "deny");
  return fs.existsSync(legacyDenyDir) || fs.existsSync(policyDenyDir);
}

function resolveDenyDir(manifest, bundleDir) {
  if (manifest?.fixtures?.deny_policy_dir) return manifest.fixtures.deny_policy_dir;
  const legacy = path.join(bundleDir, "fixtures", "deny");
  if (fs.existsSync(legacy)) return legacy;
  return path.join(bundleDir, "fixtures", "policy", "deny");
}

function parseArgs(argv) {
  const args = [...argv];
  let manifestPath = null;
  let outDir = "evidence/runs/verify-subsumption-bundle";
  let fixturePath = null;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--manifest") {
      manifestPath = args[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--out") {
      outDir = args[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--fixture") {
      fixturePath = args[i + 1];
      i += 1;
      continue;
    }
    if (!manifestPath && !arg.startsWith("-")) {
      manifestPath = arg;
    }
  }

  if (fixturePath && !manifestPath) {
    const fixtureManifest = path.join(fixturePath, "manifest.yaml");
    if (fs.existsSync(fixtureManifest)) {
      manifestPath = fixtureManifest;
    }
  }

  return { manifestPath, outDir };
}

function checkDependencyDelta(repoRoot, manifest, failures) {
  if (!manifest?.dependency_delta?.required_if_deps_change) return;
  const baseRef = process.env.GITHUB_BASE_REF;
  if (!baseRef) return;
  const docRoot = manifest?.dependency_delta?.doc_root || "deps_delta";
  const lockfiles = new Set([
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "requirements.txt",
    "poetry.lock",
    "Cargo.lock",
  ]);

  try {
    const diff = execSync(`git diff --name-only origin/${baseRef}...HEAD`, {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim()
      .split("\n")
      .filter(Boolean);
    const depsChanged = diff.some((file) => lockfiles.has(file));
    if (!depsChanged) return;
    const docRootPath = resolvePath(repoRoot, docRoot);
    if (!docRootPath || !fs.existsSync(docRootPath)) {
      failures.push(`Dependency delta required but doc root missing: ${docRoot}`);
      return;
    }
    const entries = fs
      .readdirSync(docRootPath)
      .filter((entry) => entry.endsWith(".md") && entry !== "README.md");
    if (entries.length === 0) {
      failures.push(`Dependency delta required but no entries found in ${docRoot}`);
    }
  } catch {
    return;
  }
}

const { manifestPath, outDir } = parseArgs(process.argv.slice(2));
if (!manifestPath) {
  fail(
    "Usage: node scripts/ci/verify_subsumption_bundle.mjs --manifest <manifest.yaml> [--out <dir>]"
  );
}

if (!fs.existsSync(manifestPath)) fail(`Missing manifest: ${manifestPath}`);
const manifest = parseManifest(manifestPath);
if (!manifest?.version) fail("Manifest missing: version");

const repoRoot = process.cwd();
const failures = [];
const docsTargets = getDocsTargets(manifest);

for (const docPath of docsTargets) {
  const resolved = resolvePath(repoRoot, docPath);
  if (!resolved || !fs.existsSync(resolved)) {
    failures.push(`Missing required doc: ${docPath}`);
  }
}

const schemas = getEvidenceSchemas(manifest);
for (const [label, schemaPath] of Object.entries(schemas)) {
  const resolved = resolvePath(repoRoot, schemaPath);
  if (!resolved || !fs.existsSync(resolved)) {
    failures.push(`Missing required ${label} schema: ${schemaPath}`);
  }
}

const evidenceIndexPath = resolvePath(repoRoot, getEvidenceIndexPath(manifest));
const evidenceIndex = loadEvidenceIndex(evidenceIndexPath, failures);

const requiredIds = getRequiredEvidenceIds(manifest);
for (const id of requiredIds) {
  const hit = evidenceIndex?.evidence?.[id];
  if (!hit) {
    failures.push(`Evidence ID missing from index: ${id}`);
  }
}

if (shouldRequireDenyFixture(manifest, path.dirname(manifestPath))) {
  const bundleDir = path.dirname(manifestPath);
  const denyDir = resolveDenyDir(manifest, bundleDir);
  const denyPath = resolvePath(repoRoot, denyDir);
  if (!denyPath || !fs.existsSync(denyPath)) {
    failures.push(`Missing deny-by-default fixture: ${denyDir}`);
  } else {
    const stat = fs.statSync(denyPath);
    const marker = stat.isDirectory() ? path.join(denyPath, "README.md") : denyPath;
    if (!fs.existsSync(marker)) {
      failures.push(`Missing deny-by-default fixture: ${denyDir}/README.md`);
    }
  }
}

const prs = Array.isArray(manifest?.prs) ? manifest.prs : [];
if (prs.length > 7) failures.push(`PR cap exceeded: ${prs.length} > 7`);
const yellowCount = prs.filter((pr) => pr.risk === "yellow").length;
const redCount = prs.filter((pr) => pr.risk === "red").length;
if (yellowCount > 2) failures.push(`Yellow risk cap exceeded: ${yellowCount} > 2`);
if (redCount > 0) failures.push(`Red risk not allowed: ${redCount}`);

checkDependencyDelta(repoRoot, manifest, failures);

const evidenceId = requiredIds[0] || "EVD-SUBSUMPTION-FRAMEWORK-GOV-001";
const started = Date.now();
const report = {
  version: 1,
  evidence_id: evidenceId,
  item_slug: manifest?.item_slug || manifest?.item?.slug || "unknown",
  summary: failures.length === 0 ? "PASS" : "FAIL",
  claims: Array.isArray(manifest?.claims) ? manifest.claims : [],
  decisions: failures.length === 0 ? ["accept"] : ["reject"],
  failures,
};
const metrics = {
  version: 1,
  evidence_id: evidenceId,
  counters: {
    runtime_ms: Date.now() - started,
    failures_count: failures.length,
    docs_targets_count: docsTargets.length,
    required_evidence_ids_count: requiredIds.length,
    missing_required_count: failures.length,
  },
};
const stamp = {
  version: 1,
  evidence_id: evidenceId,
  tool: "verify_subsumption_bundle",
  generated_at: new Date().toISOString(),
};

writeDeterministicJson(path.join(outDir, "report.json"), report);
writeDeterministicJson(path.join(outDir, "metrics.json"), metrics);
writeDeterministicJson(path.join(outDir, "stamp.json"), stamp);

if (failures.length > 0) {
  fail(`verify_subsumption_bundle: FAIL (${failures.length})`);
}

console.log("verify_subsumption_bundle: PASS");
