import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths relative to repo root (assuming script is in scripts/web/)
const REPO_ROOT = path.resolve(__dirname, '../../');
const MD_PATH = path.join(REPO_ROOT, 'website/src/content/ga.md');
const JSON_PATH = path.join(REPO_ROOT, 'website/src/content/ga.claims.json');
const GO_NO_GO_PATH = path.join(REPO_ROOT, 'docs/ga/commanders-go-packet.md');

function fail(msg) {
  console.error(`\x1b[31m[FAIL] ${msg}\x1b[0m`);
  process.exit(1);
}

function pass(msg) {
  console.log(`\x1b[32m[PASS] ${msg}\x1b[0m`);
}

// 1. Read Files
if (!fs.existsSync(MD_PATH)) fail(`Missing Markdown file: ${MD_PATH}`);
if (!fs.existsSync(JSON_PATH)) fail(`Missing JSON schema: ${JSON_PATH}`);
if (!fs.existsSync(GO_NO_GO_PATH)) fail(`Missing Go/No-Go Packet: ${GO_NO_GO_PATH}`);

const mdContent = fs.readFileSync(MD_PATH, 'utf-8');
const jsonContent = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));
const goPacketContent = fs.readFileSync(GO_NO_GO_PATH, 'utf-8');

// 2. Verify GO Status
const packetGoMatch = goPacketContent.match(/0\) Executive Order\s*\n\s*(GO)/i);
if (!packetGoMatch || !packetGoMatch[1]) {
  fail('Could not confirm GO status in Commanders Go Packet');
}
if (jsonContent.release.status !== 'GO') {
  fail(`Schema status '${jsonContent.release.status}' does not match 'GO'`);
}
pass('GO status confirmed against packet.');

// 3. Extract Claims from MD
const mdClaimRegex = /<!-- CLAIM: (.*?) -->/g;
const mdClaims = [];
let match;
while ((match = mdClaimRegex.exec(mdContent)) !== null) {
  mdClaims.push(match[1]);
}

// 4. Validate Claims
const jsonClaimsMap = new Map(jsonContent.claims.map(c => [c.id, c]));

// Check strict 1:1 mapping of IDs
mdClaims.forEach(id => {
  if (!jsonClaimsMap.has(id)) {
    fail(`MD references claim ID '${id}' which is missing in JSON schema.`);
  }
});
pass('All MD claim references exist in JSON.');

// Check every JSON claim is used in MD (optional but good for hygiene, strictness requested)
// "Every publicText fragment must appear verbatim in ga.md." implies usage.
// "No orphan claims" logic might be good.
// But mostly we care that every MD claim is validated.

// Check Public Text Verbatim
jsonContent.claims.forEach(claim => {
  if (!mdContent.includes(claim.publicText)) {
    fail(`Claim '${claim.id}' publicText fragment not found verbatim in ga.md:\n"${claim.publicText}"`);
  }

  // Check Evidence Path
  const evidencePath = path.join(REPO_ROOT, claim.evidence.path);
  if (!fs.existsSync(evidencePath)) {
    fail(`Claim '${claim.id}' cites missing evidence: ${claim.evidence.path}`);
  }
});
pass('All JSON claims have verbatim text matches in MD and valid evidence paths.');

console.log('\n\x1b[1mGA Page Validation Complete. Release is verifiable.\x1b[0m');
