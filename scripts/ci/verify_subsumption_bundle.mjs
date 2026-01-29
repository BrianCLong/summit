import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function sha256(buf){ return crypto.createHash("sha256").update(buf).digest("hex"); }
function read(p){ return fs.readFileSync(p, "utf8"); }
function exists(p){ return fs.existsSync(p); }
function die(msg){ console.error(msg); process.exit(1); }

const args = new Set(process.argv.slice(2));
const item = process.argv.includes("--item") ? process.argv[process.argv.indexOf("--item")+1] : "mcp-apps";
const checkFixtures = args.has("--fixtures");

const root = process.cwd();
const manifestPath = path.join(root, "subsumption", item, "manifest.yaml");
if(!exists(manifestPath)) die(`missing manifest: ${manifestPath}`);

const docsRequired = [
  "docs/standards/mcp-apps.md",
  "docs/security/data-handling/mcp-apps.md",
  "docs/ops/runbooks/mcp-apps.md",
  "docs/decisions/mcp-apps.md"
];
for(const d of docsRequired){
  if(!exists(path.join(root,d))) die(`missing required doc: ${d}`);
}

const policyPath = path.join(root, "subsumption", item, "policy.yaml");
if(!exists(policyPath)) die(`missing policy: ${policyPath}`);

if(checkFixtures){
  const denyDir = path.join(root, "subsumption", item, "fixtures", "deny");
  const allowDir = path.join(root, "subsumption", item, "fixtures", "allow");
  if(!exists(denyDir)) die("missing deny fixtures dir");
  if(!exists(allowDir)) die("missing allow fixtures dir");

  // Minimal deterministic fixture assertions (clean-room):
  // - deny fixtures MUST contain a marker that triggers deny
  // - allow fixtures MUST not contain disallowed markers
  const denyFiles = fs.readdirSync(denyDir).filter(f=>f.endsWith(".yaml"));
  const allowFiles = fs.readdirSync(allowDir).filter(f=>f.endsWith(".yaml"));
  if(denyFiles.length < 3) die("need at least 3 deny fixtures");
  if(allowFiles.length < 1) die("need at least 1 allow fixture");

  const disallowedMarkers = ["<script", "javascript:", "onerror="];
  for(const f of denyFiles){
    const t = read(path.join(denyDir,f)).toLowerCase();
    const hit = disallowedMarkers.some(m=>t.includes(m));
    if(!hit && !t.includes("expected: deny")) die(`deny fixture missing deny marker: ${f}`);
  }
  for(const f of allowFiles){
    const t = read(path.join(allowDir,f)).toLowerCase();
    const hit = disallowedMarkers.some(m=>t.includes(m));
    if(hit) die(`allow fixture contains disallowed marker: ${f}`);
    if(!t.includes("expected: allow")) die(`allow fixture missing expected: allow: ${f}`);
  }

  // Metrics (numbers only)
  writeEvidence(item, {
    verifier_ok: 1,
    fixtures_deny: denyFiles.length,
    fixtures_allow: allowFiles.length
  }, [
    "EVD-MCPAPPS-SEC-001",
    "EVD-MCPAPPS-SEC-002",
    "EVD-MCPAPPS-SEC-003"
  ], [
    { path: "subsumption/mcp-apps/manifest.yaml", sha256: sha256(Buffer.from(read(manifestPath))) },
    { path: "subsumption/mcp-apps/policy.yaml", sha256: sha256(Buffer.from(read(policyPath))) }
  ]);
} else {
  writeEvidence(item, { verifier_ok: 1 }, ["EVD-MCPAPPS-GOV-001"], [
    { path: "subsumption/mcp-apps/manifest.yaml", sha256: sha256(Buffer.from(read(manifestPath))) }
  ]);
}

function writeEvidence(itemSlug, metricsObj, evidenceIds, artifacts){
  const evidenceDir = path.join(root, "evidence", itemSlug);
  fs.mkdirSync(evidenceDir, { recursive: true });

  // Deterministic report/metrics (no timestamps)
  const report = {
    item_slug: itemSlug,
    evidence_ids: evidenceIds,
    claims: [],
    decisions: ["verify_subsumption_bundle executed"],
    artifacts
  };
  fs.writeFileSync(path.join(evidenceDir,"report.json"), JSON.stringify(report, null, 2) + "\n");
  fs.writeFileSync(path.join(evidenceDir,"metrics.json"), JSON.stringify({ item_slug: itemSlug, metrics: metricsObj }, null, 2) + "\n");

  // stamp may include timestamps
  fs.writeFileSync(path.join(evidenceDir,"stamp.json"), JSON.stringify({
    item_slug: itemSlug,
    tool_versions: { node: process.version },
    generated_at: new Date().toISOString()
  }, null, 2) + "\n");
}
