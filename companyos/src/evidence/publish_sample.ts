import crypto from 'node:crypto';
import fs from 'node:fs';
import { publishEvidence } from './publisher.js';

function readReleaseId(): string | undefined {
  if (process.env.RELEASE_ID) return process.env.RELEASE_ID;
  // Try Kubernetes downward API mounted file
  try {
    const labels = fs.readFileSync('/etc/podinfo/labels', 'utf8');
    const m = labels.match(/release-id="([^"]+)"/);
    if (m) return m[1];
  } catch {}
  return undefined;
}

async function main() {
  const releaseId = readReleaseId() ?? `rel_${Date.now()}`;
  const artifacts = [
    { type: 'sbom', sha256: crypto.randomBytes(32).toString('hex') },
    { type: 'tests', sha256: crypto.randomBytes(32).toString('hex') },
  ];
  const res = await publishEvidence(releaseId, 'companyos', artifacts);
  console.log('publishEvidence:', res);
}

if (process.env.NODE_ENV !== 'test') {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
