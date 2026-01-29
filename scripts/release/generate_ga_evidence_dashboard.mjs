#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

function compareStringsCodepoint(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function sha256Hex(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function sha256File(filePath) {
  const data = fs.readFileSync(filePath);
  return sha256Hex(data);
}

function fileExists(p) {
  try {
    return fs.existsSync(p) && fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i += 2) out[args[i].replace(/^--/, '')] = args[i + 1];
  return out;
}

function mdEscape(s) {
  return String(s).replace(/\|/g, '\\|');
}

function laneRollupDigest(artifacts) {
  // Deterministic digest-of-digests:
  // concatenate lines "path sha256\n" sorted by path, then sha256.
  const lines = artifacts
    .slice()
    .sort((a, b) => compareStringsCodepoint(a.path, b.path))
    .map((a) => `${a.path} ${a.sha256}\n`)
    .join('');
  return sha256Hex(Buffer.from(lines, 'utf8'));
}

const args = parseArgs();
const evidenceDir = args['evidence-dir'] || args.evidenceDir || 'evidence';
const outMd = args.out || path.join(evidenceDir, 'GA_EVIDENCE_DASHBOARD.md');

const provenancePath = path.join(evidenceDir, 'provenance.json');
const evidenceIndexPath = path.join(evidenceDir, 'evidence-index.json');
const manifestPath = path.join(evidenceDir, 'ga-evidence-manifest.json');

if (!fileExists(provenancePath) || !fileExists(evidenceIndexPath) || !fileExists(manifestPath)) {
  console.error('Missing required evidence files. Expected: provenance.json, evidence-index.json, ga-evidence-manifest.json');
  process.exit(1);
}

const provenance = JSON.parse(fs.readFileSync(provenancePath, 'utf8'));
const evidenceIndex = JSON.parse(fs.readFileSync(evidenceIndexPath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const verifyArtifacts = Array.isArray(provenance.verifyArtifacts) ? provenance.verifyArtifacts : [];
verifyArtifacts.sort((a, b) =>
  compareStringsCodepoint(`${a.lane}:${a.path}`, `${b.lane}:${b.path}`)
);

// Group by lane
const lanes = {};
for (const a of verifyArtifacts) {
  const lane = a.lane || 'unknown';
  if (!lanes[lane]) lanes[lane] = [];
  lanes[lane].push({ path: a.path, sha256: a.sha256 });
}
const laneNames = Object.keys(lanes).sort(compareStringsCodepoint);

const subjects = evidenceIndex.subjects || {};
const subjectRows = [
  { name: 'provenance', obj: subjects.provenance },
  { name: 'sbom', obj: subjects.sbom },
  { name: 'rebuild-manifest', obj: subjects.rebuildManifest },
].filter((r) => r.obj && r.obj.path && r.obj.sha256);

let md = '';
md += '# GA Evidence Dashboard\n\n';
md += 'Deterministic, auditor-grade snapshot of build verification and golden-path provenance.\n\n';

md += '## Core Subjects\n\n';
md += '| Subject | Path | SHA256 |\n';
md += '|---|---|---|\n';
for (const r of subjectRows) {
  md += `| ${mdEscape(r.name)} | ${mdEscape(r.obj.path)} | ${mdEscape(r.obj.sha256)} |\n`;
}
md += '\n';

md += '## Verify Lanes Summary\n\n';
md += '| Lane | Artifacts | Rollup SHA256 |\n';
md += '|---|---:|---|\n';
for (const lane of laneNames) {
  const rollup = laneRollupDigest(lanes[lane]);
  md += `| ${mdEscape(lane)} | ${lanes[lane].length} | ${mdEscape(rollup)} |\n`;
}
md += '\n';

md += '## Evidence Manifest Totals\n\n';
md += `Subjects: ${manifest.totals?.subjects ?? 'n/a'}\n\n`;
md += `Verify artifacts: ${manifest.totals?.verifyArtifacts ?? 'n/a'}\n\n`;
md += `All evidence items: ${manifest.totals?.all ?? 'n/a'}\n\n`;

md += '## Attestation Target\n\n';
md += 'The build provenance attestation is bound to:\n\n';
md += `- ${mdEscape(path.basename(provenancePath))} (sha256: ${mdEscape(sha256File(provenancePath))})\n\n`;

md += '## Notes\n\n';
md += '- No timestamps are included in this dashboard or its upstream JSON artifacts.\n';
md += '- All lists are codepoint-sorted to prevent locale variance.\n';
md += '- Rollup digests are deterministic “digest-of-digests” over lane artifact paths + SHA256.\n';

fs.writeFileSync(outMd, md, 'utf8');
console.log(`Wrote ${outMd}`);
