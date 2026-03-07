import fs from 'node:fs';
import path from 'node:path';

const sha = process.env.GITHUB_SHA;
const prRaw = process.env.PR_NUMBER || '';
const prNumber = prRaw ? Number(prRaw) : null;

if (!sha) {
  throw new Error('GITHUB_SHA is required to write evidence.');
}

const repoRoot = process.cwd();
const evidenceDir = path.join(repoRoot, 'evidence', sha);
const sbomPath = path.join(repoRoot, 'sbom.spdx.json');
const sbomPresent = fs.existsSync(sbomPath);

fs.mkdirSync(evidenceDir, { recursive: true });

const stamp = {
  generatedAt: new Date().toISOString(),
  commit: sha,
};

const provenanceStatus = 'blocked';
const report = {
  schema: 'v1',
  commit: sha,
  pr: prNumber,
  sbom: {
    format: 'spdx-json',
    present: sbomPresent,
  },
  provenance: {
    status: provenanceStatus,
    reason: 'signing_not_enabled_in_pr1',
  },
  status: sbomPresent ? 'blocked' : 'fail',
};

const sbomBytes = sbomPresent ? fs.statSync(sbomPath).size : 0;
const metrics = {
  sbom_bytes: sbomBytes,
};

const index = {
  'EVD-ai-platform-dev-2026-02-07-PROV-001': [
    'sbom.spdx.json',
    `evidence/${sha}/report.json`,
  ],
  'EVD-ai-platform-dev-2026-02-07-PROV-004': [
    `evidence/${sha}/badge.json`,
    `evidence/${sha}/report.json`,
  ],
};

const badgeColor =
  provenanceStatus === 'pass'
    ? 'brightgreen'
    : provenanceStatus === 'blocked'
      ? 'yellow'
      : 'red';
const badge = {
  schema: 'v1',
  label: 'provenance',
  message: provenanceStatus,
  color: badgeColor,
  link: `./evidence/${sha}/report.json`,
};

fs.writeFileSync(path.join(evidenceDir, 'stamp.json'), JSON.stringify(stamp, null, 2));
fs.writeFileSync(path.join(evidenceDir, 'report.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(evidenceDir, 'metrics.json'), JSON.stringify(metrics, null, 2));
fs.writeFileSync(path.join(evidenceDir, 'index.json'), JSON.stringify(index, null, 2));
fs.writeFileSync(path.join(evidenceDir, 'badge.json'), JSON.stringify(badge, null, 2));

if (!sbomPresent) {
  console.error('SBOM file sbom.spdx.json is missing.');
  process.exitCode = 1;
}
