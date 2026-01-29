// scripts/ci/verify_subsumption_bundle.mjs
import fs from "node:fs";
import path from "node:path";

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function readText(p) {
  return fs.readFileSync(p, "utf8");
}

// Minimal YAML parsing (no deps): supports `key: value` and arrays of scalars
function parseYamlMinimal(yaml) {
  const lines = yaml.split(/\r?\n/);
  const out = {};
  let currentKey = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("- ")) {
      if (!currentKey) fail("YAML parse error: array item without key");
      out[currentKey] = out[currentKey] || [];
      out[currentKey].push(line.slice(2).trim().replace(/^"|"$/g, ""));
      continue;
    }
    const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (m) {
      currentKey = m[1];
      const v = m[2].trim();
      out[currentKey] = v === "" ? "" : v.replace(/^"|"$/g, "");
      continue;
    }
  }
  return out;
}

const manifestPath = process.argv[2];
if (!manifestPath) fail("Usage: node scripts/ci/verify_subsumption_bundle.mjs <manifest.yaml>");

if (!fs.existsSync(manifestPath)) fail(`Missing manifest: ${manifestPath}`);
const manifestRaw = readText(manifestPath);

// NOTE: This is intentionally minimal; full YAML structure validation is enforced via required file existence checks.
const top = parseYamlMinimal(manifestRaw);
if (!top.version) fail("Manifest missing: version");

const root = path.resolve(path.dirname(manifestPath), "..", "..");
const required = [
  path.join(root, "evidence", "index.json"),
  path.join(root, "evidence", "schemas", "report.schema.json"),
  path.join(root, "evidence", "schemas", "metrics.schema.json"),
  path.join(root, "evidence", "schemas", "stamp.schema.json"),
];

for (const p of required) {
  if (!fs.existsSync(p)) fail(`Missing required file: ${p}`);
}

// Deny-by-default fixtures required for every bundle
const bundleDir = path.dirname(manifestPath);
const denyFixture = path.join(bundleDir, "fixtures", "deny", "README.md");
const allowFixture = path.join(bundleDir, "fixtures", "allow", "README.md");
if (!fs.existsSync(denyFixture)) fail(`Missing deny-by-default fixture: ${denyFixture}`);
if (!fs.existsSync(allowFixture)) fail(`Missing allow fixture: ${allowFixture}`);

console.log("OK: subsumption bundle basic verification passed");
