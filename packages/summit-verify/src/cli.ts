import { verifyAttestation, writeEvidence } from './verify.js';

const runId = process.argv[2];
const attestationPath = process.argv[3];
const manifestDigest = process.argv[4];
const outputDir = process.argv[5] || './evidence';

if (!runId || !attestationPath || !manifestDigest) {
  console.error('Usage: summit-verify <runId> <attestationPath> <manifestDigest> [outputDir]');
  process.exit(1);
}

const result = verifyAttestation(runId, attestationPath, manifestDigest);
const evidenceId = `evid:summit:lineage-attest:v1:${runId}`;

writeEvidence(evidenceId, runId, result, outputDir);

console.log(`Verification ${result.status}`);
console.log(`Evidence written to ${outputDir}`);

if (result.status === 'FAIL') {
  process.exit(1);
}
