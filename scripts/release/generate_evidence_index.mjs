#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

function compareStringsCodepoint(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function stableClone(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(stableClone);
  if (typeof value !== 'object') return value;

  const keys = Object.keys(value).sort(compareStringsCodepoint);
  const out = {};
  for (const k of keys) out[k] = stableClone(value[k]);
  return out;
}

function stableStringify(value) {
  return JSON.stringify(stableClone(value), null, 2) + '\n';
}

function sha256File(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
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

function groupByLane(verifyArtifacts) {
  const lanes = {};
  for (const a of verifyArtifacts) {
    if (!lanes[a.lane]) lanes[a.lane] = [];
    lanes[a.lane].push({ path: a.path, sha256: a.sha256 });
  }
  for (const lane of Object.keys(lanes)) {
    lanes[lane].sort((x, y) => compareStringsCodepoint(x.path, y.path));
  }
  return lanes;
}

function mdEscape(s) {
  return String(s).replace(/\|/g, '\\|');
}

const args = parseArgs();
const evidenceDir = args['evidence-dir'] || args.evidenceDir || 'evidence';
const provenancePath = args.provenance || path.join(evidenceDir, 'provenance.json');
const outJson = args.outjson || path.join(evidenceDir, 'evidence-index.json');
const outMd = args.outmd || path.join(evidenceDir, 'EVIDENCE_INDEX.md');

if (!fileExists(provenancePath)) {
  console.error(`Missing provenance file: ${provenancePath}`);
  process.exit(1);
}

const provenance = JSON.parse(fs.readFileSync(provenancePath, 'utf8'));
const verifyArtifacts = Array.isArray(provenance.verifyArtifacts) ? provenance.verifyArtifacts : [];
verifyArtifacts.sort((a, b) =>
  compareStringsCodepoint(`${a.lane}:${a.path}`, `${b.lane}:${b.path}`)
);

const lanes = groupByLane(verifyArtifacts);

const sbomPath = path.join(evidenceDir, 'sbom.cdx.json');
const rebuildManifestPath = path.join(evidenceDir, 'rebuild-manifest.json');
const provenanceSelfHash = sha256File(provenancePath);

const index = {
  schemaVersion: '1.0',
  generated: {
    // Intentionally no timestamps to preserve determinism.
    evidenceDir: path.basename(evidenceDir),
  },
  subjects: {
    provenance: {
      path: path.relative(evidenceDir, provenancePath).replace(/\\/g, '/'),
      sha256: provenanceSelfHash,
    },
  },
  verify: {
    lanes: {},
    totals: {
      lanes: Object.keys(lanes).length,
      artifacts: verifyArtifacts.length,
    },
  },
};

if (fileExists(sbomPath)) {
  index.subjects.sbom = {
    path: path.relative(evidenceDir, sbomPath).replace(/\\/g, '/'),
    sha256: sha256File(sbomPath),
  };
}
if (fileExists(rebuildManifestPath)) {
  index.subjects.rebuildManifest = {
    path: path.relative(evidenceDir, rebuildManifestPath).replace(/\\/g, '/'),
    sha256: sha256File(rebuildManifestPath),
  };
}

for (const lane of Object.keys(lanes).sort(compareStringsCodepoint)) {
  const artifacts = lanes[lane];
  index.verify.lanes[lane] = {
    count: artifacts.length,
    artifacts,
  };
}

fs.writeFileSync(outJson, stableStringify(index), 'utf8');

// Markdown rendering (stable order)
let md = '';
md += '# Evidence Index\n\n';
md += 'This index is deterministic: stable ordering, no timestamps, SHA256 digests for integrity.\n\n';

md += '## Core Subjects\n\n';
md += '| Subject | Path | SHA256 |\n';
md += '|---|---|---|\n';
md += `| provenance | ${mdEscape(index.subjects.provenance.path)} | ${mdEscape(index.subjects.provenance.sha256)} |\n`;
if (index.subjects.sbom) {
  md += `| sbom | ${mdEscape(index.subjects.sbom.path)} | ${mdEscape(index.subjects.sbom.sha256)} |\n`;
}
if (index.subjects.rebuildManifest) {
  md += `| rebuild-manifest | ${mdEscape(index.subjects.rebuildManifest.path)} | ${mdEscape(index.subjects.rebuildManifest.sha256)} |\n`;
}
md += '\n';

md += '## Verify Lanes\n\n';
md += `Totals: ${index.verify.totals.lanes} lane(s), ${index.verify.totals.artifacts} artifact(s).\n\n`;

for (const lane of Object.keys(index.verify.lanes).sort(compareStringsCodepoint)) {
  const laneObj = index.verify.lanes[lane];
  md += `### ${lane}\n\n`;
  md += `Artifacts: ${laneObj.count}\n\n`;
  md += '| Artifact Path | SHA256 |\n';
  md += '|---|---|\n';
  for (const a of laneObj.artifacts) {
    md += `| ${mdEscape(a.path)} | ${mdEscape(a.sha256)} |\n`;
  }
  md += '\n';
}

fs.writeFileSync(outMd, md, 'utf8');

console.log(`Wrote ${outJson}`);
console.log(`Wrote ${outMd}`);
