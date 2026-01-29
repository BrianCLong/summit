#!/usr/bin/env node
/**
 * verify_subsumption_bundle.mjs
 * Deterministic verifier for subsumption bundles.
 * - No network calls
 * - Stable JSON outputs (report/metrics) without timestamps
 * - stamp.json may include timestamps
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function die(msg) { console.error(msg); process.exit(1); }

function readUtf8(p) { return fs.readFileSync(p, "utf8"); }
function exists(p) { return fs.existsSync(p); }

function stableStringify(obj) {
  const allKeys = [];
  JSON.stringify(obj, (k, v) => (allKeys.push(k), v));
  allKeys.sort();
  return JSON.stringify(obj, allKeys, 2) + "\n";
}

// Better YAML parser for the subset used in manifests
function parseTinyYaml(yml) {
  const lines = yml.split(/\r?\n/);
  const root = {};
  // stack items: { indent, obj, mode: 'object'|'array', key? }
  // mode='object': expect "key: value"
  // mode='array': expect "- value"
  const stack = [{ indent: -1, obj: root, mode: 'object' }];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim() || raw.trim().startsWith("#")) continue;

    const indent = raw.search(/\S/);
    const line = raw.trim();

    // Pop stack if we dedented
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }
    const current = stack[stack.length - 1];

    // Check for list item "- value" or "- key: value"
    if (line.startsWith("- ")) {
      if (!Array.isArray(current.obj)) {
        // If we found a list item but current obj is not array, it might be that we just started a list
        // But in YAML "key:\n - item" means key value is array.
        // We handle that by checking parent.
      }

      const content = line.substring(2).trim();

      // Case: "- value" (string/number)
      // Case: "- key: value" (object in list)

      // Let's ensure current container is an array
      // If the parent key expected an array, we should be fine.
      // But we need to handle "key:" (empty value) -> implies next lines are children.

      if (!Array.isArray(current.obj)) {
         // Should not happen if parser logic below handles "key:" correctly by creating array if needed?
         // Actually in YAML "key:\n  - item" -> indent of "- item" > indent of "key:"
      }

      // Check if content is "key: value"
      const kvMatch = content.match(/^([A-Za-z0-9_-]+):(?:\s+(.*))?$/);
      if (kvMatch) {
         // It's an object inside a list: "- id: foo"
         const newObj = {};
         current.obj.push(newObj);
         stack.push({ indent, obj: newObj, mode: 'object' });

         // Process the key-value on this line
         const k = kvMatch[1];
         let v = kvMatch[2];
         if (v === undefined || v === "" || v === null) {
            // Nested object follows?
             // Not supported in this simplified logic for inline "- key:" without value
             // usually "- key: value" is common.
             // or "- key:\n    val"
         } else {
            newObj[k] = parseValue(v);
         }
         continue;
      }

      // Just a scalar value: "- https://..."
      current.obj.push(parseValue(content));
      continue;
    }

    // Check for "key: value"
    const m = line.match(/^([A-Za-z0-9_-]+):(?:\s*(.*))?$/);
    if (m) {
      const key = m[1];
      let valStr = m[2];

      if (valStr === undefined || valStr === "" || valStr === null) {
        // Empty value, likely a parent of object or list
        // We don't know yet if it's object or list. We'll peek next line?
        // Or we create an empty object and let next lines convert it if they start with "-"?
        // Simpler: assume object, if child is "- ...", convert to array.
        const newObj = {}; // default to object
        current.obj[key] = newObj;

        // Peek next line to see if it starts with "-"
        // (Crude lookahead)
        let j = i + 1;
        while(j < lines.length && (!lines[j].trim() || lines[j].trim().startsWith("#"))) j++;
        if (j < lines.length) {
            const nextLine = lines[j];
            const nextIndent = nextLine.search(/\S/);
            if (nextIndent > indent && nextLine.trim().startsWith("- ")) {
                current.obj[key] = [];
            }
        }

        stack.push({ indent: indent, obj: current.obj[key], mode: Array.isArray(current.obj[key]) ? 'array' : 'object' });
      } else {
        // Scalar value
        current.obj[key] = parseValue(valStr);
      }
      continue;
    }

    // If we are in a list and line doesn't start with "-", maybe it is continuation?
    // Or we are in an object and it's a "key: value" we missed?
    // Maybe the value was quoted string with colons?

    // Try to match "key: value" where value might contain colons if quoted.
    // Regex ^([A-Za-z0-9_-]+):\s*(.+)$
    // We used that above.
    // If validation failed there, maybe logic was strict.

    die(`YAML parse error on line: ${raw}`);
  }
  return root;
}

function parseValue(val) {
  if (val === "true") return true;
  if (val === "false") return false;
  if (val === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(val)) return Number(val);

  // Remove quotes if present
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    return val.substring(1, val.length - 1);
  }
  return val;
}

function hashFile(p) {
  const b = fs.readFileSync(p);
  return crypto.createHash("sha256").update(b).digest("hex");
}

const manifestPath = process.argv[2] || "subsumption/azure-turin-v7/manifest.yaml";
if (!exists(manifestPath)) die(`Missing manifest: ${manifestPath}`);

const t0 = Date.now();
const manifest = parseTinyYaml(readUtf8(manifestPath));

const errors = [];
function req(cond, msg) { if (!cond) errors.push(msg); }

req(manifest.item && manifest.item.slug, "manifest.item.slug missing");
req(manifest.prs, "manifest.prs missing");
req(manifest.docs_targets, "manifest.docs_targets missing");

const docsTargets = Array.isArray(manifest.docs_targets) ? manifest.docs_targets : [];
for (const p of docsTargets) req(exists(p), `Missing doc target: ${p}`);

req(exists("evidence/schemas/report.schema.json"), "Missing report schema");
req(exists("evidence/schemas/metrics.schema.json"), "Missing metrics schema");
req(exists("evidence/schemas/stamp.schema.json"), "Missing stamp schema");
req(exists("evidence/index.json"), "Missing evidence/index.json");

const report = {
  evidence_id: "EVD-AZURETURINV7-GATE-001",
  item_slug: "azure-turin-v7",
  claims: (manifest.claims || []).map(c => c.id).filter(Boolean),
  decisions: [],
  findings: [
    { kind: "manifest_sha256", value: hashFile(manifestPath) }
  ],
  errors
};

const metrics = {
  evidence_id: "EVD-AZURETURINV7-MET-001",
  metrics: {
    verifier_runtime_ms: Date.now() - t0,
    error_count: errors.length
  }
};

const stamp = {
  evidence_id: "EVD-AZURETURINV7-GATE-001",
  tool_versions: { node: process.version },
  generated_at: new Date().toISOString()
};

// Output location (deterministic path)
const outDir = "evidence/azure-turin-v7/verifier";
fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(path.join(outDir, "report.json"), stableStringify(report));
fs.writeFileSync(path.join(outDir, "metrics.json"), stableStringify(metrics));
fs.writeFileSync(path.join(outDir, "stamp.json"), JSON.stringify(stamp, null, 2) + "\n");

if (errors.length) die(`Subsumption bundle verification failed (${errors.length} errors).`);
console.log("Subsumption bundle verification passed.");
