import fs from "node:fs";
import path from "node:path";
import { extractFrontMatterJson } from "./extract_frontmatter.mjs";
import { normalizeMeta } from "./normalize_meta.mjs";
import {
  readUtf8,
  normalizeNewlines,
  stableStringify,
  sha256Hex,
  writeUtf8Deterministic,
  mkdirp
} from "./_lib.mjs";

function loadJson(p) {
  return JSON.parse(readUtf8(p));
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const DEFAULT_ORDER = ["role", "policy", "tools", "task", "io", "style"];

function canonicalOrder(meta) {
  const order = meta?.composition?.order;
  if (!order || !Array.isArray(order) || order.length === 0) return DEFAULT_ORDER;
  return order.slice();
}

function sortFragments(fragments, order) {
  const idx = new Map(order.map((t, i) => [t, i]));
  const withIndex = fragments.map((f) => ({
    ...f,
    _orderIndex: idx.has(f.type) ? idx.get(f.type) : 999
  }));

  withIndex.sort((a, b) => {
    if (a._orderIndex !== b._orderIndex) return a._orderIndex - b._orderIndex;
    // Stable tie-breaker: type then path (codepoint order).
    if (a.type !== b.type) return a.type < b.type ? -1 : 1;
    return a.path < b.path ? -1 : a.path > b.path ? 1 : 0;
  });

  return withIndex.map(({ _orderIndex, ...rest }) => rest);
}

function readFragment(pathStr) {
  const raw = readUtf8(pathStr);
  return normalizeNewlines(raw).trimEnd();
}

function assembleCompiledPrompt({ meta, sourcePath, body }) {
  const order = canonicalOrder(meta);
  const fragments = meta.composition.fragments;
  const sorted = sortFragments(fragments, order);

  // Ensure all fragment types exist in order? No: allow missing types, but must have at least one fragment.
  assert(sorted.length > 0, `compile: no fragments for ${meta.id}@${meta.version}`);

  // Assemble with explicit section separators for readability + stable parsing.
  const parts = [];
  parts.push("=== PROMPT ARTIFACT METADATA (NON-EXECUTABLE) ===");
  parts.push(stableStringify(normalizeMeta(meta)));
  parts.push("");

  for (const f of sorted) {
    assert(fs.existsSync(f.path), `compile: fragment missing: ${f.path} referenced by ${sourcePath}`);
    parts.push(`=== FRAGMENT ${f.type.toUpperCase()} :: ${f.path} ===`);
    parts.push(readFragment(f.path));
    parts.push("");
  }

  // Include the source body (task-specific narrative, if any)
  const cleanedBody = normalizeNewlines(body).trim();
  if (cleanedBody.length > 0) {
    parts.push(`=== SOURCE BODY :: ${sourcePath} ===`);
    parts.push(cleanedBody);
    parts.push("");
  }

  // Final directive: ensures invariants stay salient.
  parts.push("=== FINAL REQUIREMENTS ===");
  parts.push("You must follow the I/O contract, satisfy all invariants, and comply with governance policy.");
  parts.push("");

  // Deterministic join.
  const compiled = parts.join("\n");
  return { compiled, fragments: sorted, order };
}

function compiledPaths(meta) {
  const base = path.join("prompts", "compiled", meta.id, meta.version);
  return {
    dir: base,
    promptTxt: path.join(base, "prompt.txt"),
    manifestJson: path.join(base, "manifest.json")
  };
}

function makeManifest({ meta, sourcePath, compiledText, fragments, order }) {
  const metaNorm = normalizeMeta(meta);
  const metaFp = sha256Hex(stableStringify(metaNorm));
  const compiledFp = sha256Hex(stableStringify(metaNorm) + "\n" + compiledText);

  const manifest = {
    manifest_version: "1.0.0",
    id: meta.id,
    version: meta.version,
    source_path: sourcePath,
    compiled_fingerprint: compiledFp,
    meta_fingerprint: metaFp,
    newline_style: "lf",
    composition: {
      order,
      fragments
    },
    compiled: {
      bytes: Buffer.byteLength(compiledText, "utf8"),
      format: "text/plain; charset=utf-8"
    }
  };

  // Deterministic object structure is ensured by stableStringify during write.
  return { manifest, metaFp, compiledFp };
}

function writeCompiled({ meta, sourcePath, compiledText, manifest }) {
  const out = compiledPaths(meta);
  mkdirp(out.dir);

  writeUtf8Deterministic(out.promptTxt, compiledText);
  writeUtf8Deterministic(out.manifestJson, stableStringify(manifest));
}

function compileAll({ registryPath }) {
  const reg = loadJson(registryPath);
  assert(Array.isArray(reg.prompts), "compile: registry.prompts must be array");

  const results = [];
  for (const p of reg.prompts) {
    const { meta, body } = extractFrontMatterJson(p.path);

    assert(meta.id === p.id, `compile: registry id mismatch for ${p.path}`);
    assert(meta.version === p.version, `compile: registry version mismatch for ${p.path}`);

    const { compiled, fragments, order } = assembleCompiledPrompt({
      meta,
      sourcePath: p.path,
      body
    });

    const { manifest, metaFp, compiledFp } = makeManifest({
      meta,
      sourcePath: p.path,
      compiledText: compiled,
      fragments,
      order
    });

    writeCompiled({
      meta,
      sourcePath: p.path,
      compiledText: compiled,
      manifest
    });

    results.push({
      id: meta.id,
      version: meta.version,
      source_path: p.path,
      meta_fingerprint: metaFp,
      compiled_fingerprint: compiledFp,
      compiled_dir: compiledPaths(meta).dir
    });
  }

  // Emit a deterministic compile report (no timestamps).
  const reportPath = path.join("prompts", "compiled", "compile_report.json");
  writeUtf8Deterministic(reportPath, stableStringify({ report_version: "1.0.0", results }));

  process.stdout.write("promptops:compile OK\n");
}

function main() {
  const registryPath = path.normalize("prompts/registry.json");
  compileAll({ registryPath });
}

main();
