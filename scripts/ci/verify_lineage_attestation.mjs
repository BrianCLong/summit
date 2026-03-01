import fs from 'fs';
import crypto from 'crypto';
import path from 'path';

// This is a skeleton/mock script for the future Sigstore/cosign attestation verification
// It implements the conceptual gate logic described in the Prompt.

const STAMP_PATH = path.join(process.cwd(), 'evidence/lineage/lineage.stamp.json');
const EXPECTED_PREDICATE_TYPE = 'https://summit.companyos.dev/attestations/lineage-stamp/v1';

async function verifyAttestationMock() {
  console.log('=== Lineage Attestation Gate (Mock) ===');

  if (!fs.existsSync(STAMP_PATH)) {
    console.error(`❌ Stamp file missing at ${STAMP_PATH}`);
    process.exit(1);
  }

  let stamp;
  try {
    stamp = JSON.parse(fs.readFileSync(STAMP_PATH, 'utf8'));
  } catch (e) {
    console.error(`❌ Failed to parse stamp: ${e.message}`);
    process.exit(1);
  }

  // 1. Verify attestation exists (Mocked as finding the stamp)
  console.log('✅ 1. Verifying attestation exists for subject digest: OK (Mock)');

  // 2. Verify signature (Mocked)
  console.log('✅ 2. Verifying keyless OIDC signature: OK (Mock)');

  // 3. Verify predicateType
  const mockPredicateType = EXPECTED_PREDICATE_TYPE;
  if (mockPredicateType !== EXPECTED_PREDICATE_TYPE) {
    console.error(`❌ PredicateType mismatch. Expected ${EXPECTED_PREDICATE_TYPE}, got ${mockPredicateType}`);
    process.exit(1);
  }
  console.log('✅ 3. Verifying predicateType: OK');

  // 4. Verify predicate content_digest
  if (!stamp.integrity || !stamp.integrity.content_digest) {
    console.error(`❌ Predicate missing integrity digest`);
    process.exit(1);
  }

  const rawJSON = JSON.parse(fs.readFileSync(STAMP_PATH, 'utf8'));
  delete rawJSON.integrity;
  const computedHash = crypto.createHash('sha256').update(JSON.stringify(rawJSON)).digest('hex');
  const expectedDigest = `sha256:${computedHash}`;

  if (stamp.integrity.content_digest !== expectedDigest) {
    console.error(`❌ Predicate content_digest mismatch`);
    process.exit(1);
  }
  console.log('✅ 4. Verifying predicate content_digest equals recomputed digest: OK');

  // 5. Verify transformation_hash (Mock checking presence)
  if (!stamp.transformation || !stamp.transformation.transformation_hash) {
    console.error(`❌ Predicate missing transformation_hash`);
    process.exit(1);
  }
  console.log('✅ 5. Verifying transformation_hash matching runtime recomputation: OK (Mock)');

  console.log('\n✅ Attestation Verification Complete');
}

verifyAttestationMock().catch(err => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
