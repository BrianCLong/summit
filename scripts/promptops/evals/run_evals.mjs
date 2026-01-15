import fs from "node:fs";
import path from "node:path";
import { extractFrontMatterJson } from "../extract_frontmatter.mjs";
import { readUtf8, stableStringify, sha256Hex, writeUtf8Deterministic, mkdirp } from "../_lib.mjs";
import { readJsonl } from "./_jsonl.mjs";
import { validateSchemaSubset } from "./_schema_subset.mjs";
import { runMustInvariants } from "./_invariants.mjs";

function loadJson(p) {
  return JSON.parse(readUtf8(p));
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function parsePromptRef(promptRef) {
  const idx = promptRef.lastIndexOf("@");
  assert(idx > 0, `invalid prompt_ref (missing @): ${promptRef}`);
  return { id: promptRef.slice(0, idx), version: promptRef.slice(idx + 1) };
}

function loadRegistry() {
  return loadJson(path.normalize("prompts/registry.json"));
}

function findPromptPath(registry, id, version) {
  for (const p of registry.prompts) {
    if (p.id === id && p.version === version) return p.path;
  }
  return null;
}

function loadPromptMeta(promptPath) {
  const { meta } = extractFrontMatterJson(promptPath);
  return meta;
}

function ensureOutputFixture(caseObj) {
  // Support either output_fixture object, or output_fixture_raw string.
  if (caseObj.output_fixture && typeof caseObj.output_fixture === "object") return caseObj.output_fixture;

  if (typeof caseObj.output_fixture_raw === "string") {
    const raw = caseObj.output_fixture_raw.trim();
    const parsed = JSON.parse(raw);
    assert(parsed && typeof parsed === "object" && !Array.isArray(parsed), "output_fixture_raw must parse to an object");
    return parsed;
  }

  throw new Error(`case ${caseObj.case_id}: missing output_fixture or output_fixture_raw`);
}

function runCase({ registry, caseObj }) {
  assert(typeof caseObj.case_id === "string" && caseObj.case_id.length > 0, "case_id required");
  assert(typeof caseObj.prompt_ref === "string", `case ${caseObj.case_id}: prompt_ref required`);
  assert(caseObj.input && typeof caseObj.input === "object", `case ${caseObj.case_id}: input required`);

  const { id, version } = parsePromptRef(caseObj.prompt_ref);
  const promptPath = findPromptPath(registry, id, version);
  assert(promptPath, `case ${caseObj.case_id}: prompt not found in registry: ${id}@${version}`);

  const meta = loadPromptMeta(promptPath);
  const output = ensureOutputFixture(caseObj);

  // Schema check (subset)
  let schemaStatus = "skipped";
  let schemaDetail = null;
  if (caseObj.expected?.schema_required) {
    schemaStatus = "pass";
    try {
      validateSchemaSubset(output, meta.outputs.schema, "$");
    } catch (e) {
      schemaStatus = "fail";
      schemaDetail = e.message;
    }
  }

  // Invariants (must)
  const invResults = runMustInvariants({ meta, output });
  const invPass = invResults.every((r) => r.status === "pass");

  // Optional: user-provided list of must_invariants to require (subset)
  const requiredInv = Array.isArray(caseObj.expected?.must_invariants) ? caseObj.expected.must_invariants : [];
  const invIndex = new Map(invResults.map((r) => [r.id, r]));
  let requiredInvStatus = "pass";
  let requiredInvMissing = [];
  for (const invId of requiredInv) {
    const res = invIndex.get(invId);
    if (!res || res.status !== "pass") requiredInvMissing.push(invId);
  }
  if (requiredInvMissing.length > 0) requiredInvStatus = "fail";

  const status =
    schemaStatus === "fail" || !invPass || requiredInvStatus === "fail" ? "fail" : "pass";

  return {
    case_id: caseObj.case_id,
    prompt_ref: caseObj.prompt_ref,
    prompt_path: promptPath,
    status,
    checks: {
      schema: { status: schemaStatus, detail: schemaDetail },
      invariants: { status: invPass ? "pass" : "fail", results: invResults },
      required_invariants: { status: requiredInvStatus, missing: requiredInvMissing }
    }
  };
}

function loadMetamorphicRules() {
  const rulesPath = path.normalize("prompts/evals/rules/metamorphic_rules.json");
  if (!fs.existsSync(rulesPath)) return null;
  return loadJson(rulesPath);
}

function applyTransform(input, t) {
  // Deterministic transform engine: shallow path only (top-level).
  const out = JSON.parse(JSON.stringify(input));
  const key = t.path;

  switch (t.erq) {
    case "reverse_array":
      if (Array.isArray(out[key])) out[key] = out[key].slice().reverse();
      return out;

    case "append_string":
      if (typeof out[key] === "string") out[key] = out[key] + String(t.value || "");
      return out;

    default:
      throw new Error(`unknown transform erq: ${t.erq}`);
  }
}

function generateMetamorphicVariants(datasetCases, rules) {
  if (!rules) return { variants: [], rules_applied: null };

  const transforms = Array.isArray(rules.transforms) ? rules.transforms : [];
  const variants = [];

  for (const c of datasetCases) {
    for (const t of transforms) {
      const inputVariant = applyTransform(c.input, t);
      const variantId = `${c.case_id}::${t.id}`;
      const fp = sha256Hex(stableStringify({ prompt_ref: c.prompt_ref, input: inputVariant }));

      variants.push({
        variant_id: variantId,
        base_case_id: c.case_id,
        prompt_ref: c.prompt_ref,
        transform_id: t.id,
        input_fingerprint: fp,
        input: inputVariant
      });
    }
  }

  // Deterministic order.
  variants.sort((a, b) => (a.variant_id < b.variant_id ? -1 : a.variant_id > b.variant_id ? 1 : 0));

  return {
    rules_applied: { rules_version: rules.rules_version || "unknown", transform_count: transforms.length },
    variants
  };
}

function main() {
  const registry = loadRegistry();

  // Discover datasets from registry prompts (union), but allow direct run for now:
  // We will scan prompts/evals/datasets/*.jsonl deterministically.
  const datasetsDir = path.normalize("prompts/evals/datasets");
  assert(fs.existsSync(datasetsDir), "missing prompts/evals/datasets directory");

  const datasetFiles = fs
    .readdirSync(datasetsDir)
    .filter((f) => f.endsWith(".jsonl"))
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .map((f) => path.join(datasetsDir, f));

  const reportsDir = path.normalize("prompts/evals/reports");
  mkdirp(reportsDir);

  const allReports = [];
  const mmRules = loadMetamorphicRules();

  for (const dsPath of datasetFiles) {
    const cases = readJsonl(dsPath);
    const caseReports = cases.map((c) => runCase({ registry, caseObj: c }));

    const passCount = caseReports.filter((r) => r.status === "pass").length;
    const failCount = caseReports.length - passCount;

    const mm = generateMetamorphicVariants(cases, mmRules);

    const report = {
      report_version: "1.0.0",
      dataset: path.basename(dsPath),
      counts: { total: caseReports.length, pass: passCount, fail: failCount },
      results: caseReports,
      metamorphic: {
        rules: mm.rules_applied,
        variants: mm.variants
      }
    };

    const outName = path.basename(dsPath).replace(/\.jsonl$/, ".report.json");
    const outPath = path.join(reportsDir, outName);
    writeUtf8Deterministic(outPath, stableStringify(report));
    allReports.push({ dataset: path.basename(dsPath), report_path: outPath, counts: report.counts });
  }

  const index = {
    index_version: "1.0.0",
    reports: allReports
  };
  writeUtf8Deterministic(path.join(reportsDir, "index.json"), stableStringify(index));

  // Non-zero exit on any failure.
  const anyFail = allReports.some((r) => r.counts.fail > 0);
  if (anyFail) {
    process.stderr.write("promptops:evals FAIL\n");
    process.exit(1);
  }

  process.stdout.write("promptops:evals OK\n");
}

main();
