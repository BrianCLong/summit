import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const getGitSha = () => {
    try {
        return execSync('git rev-parse HEAD').toString().trim();
    } catch (e) {
        return 'dev';
    }
};

const SHA = process.env.GITHUB_SHA || getGitSha();
const ARTIFACTS_DIR = process.env.ARTIFACTS_DIR || `artifacts/evidence/post-deploy/${SHA}`;
const EVIDENCE_FILE = path.join(ARTIFACTS_DIR, 'evidence.json');
const CHECKSUM_FILE = path.join(ARTIFACTS_DIR, 'checksums.txt');
const SCHEMA_FILE = path.resolve('docs/evidence/schema/post_deploy_evidence.schema.json');

function verifyEvidence() {
  console.log(`Verifying evidence in ${ARTIFACTS_DIR}...`);

  if (!fs.existsSync(EVIDENCE_FILE)) {
    console.error(`Evidence file missing: ${EVIDENCE_FILE}`);
    process.exit(1);
  }

  const evidenceContent = fs.readFileSync(EVIDENCE_FILE, 'utf-8');
  const evidence = JSON.parse(evidenceContent);

  // 1. Checksum Verification
  if (fs.existsSync(CHECKSUM_FILE)) {
      const checksumContent = fs.readFileSync(CHECKSUM_FILE, 'utf-8').trim();
      const parts = checksumContent.split(/\s+/);
      const expectedHash = parts[0];

      const actualHash = crypto.createHash('sha256').update(evidenceContent).digest('hex');

      if (actualHash !== expectedHash) {
          console.error(`Checksum mismatch! Expected: ${expectedHash}, Actual: ${actualHash}`);
          process.exit(1);
      }
      console.log("Checksum verified.");
  } else {
      console.warn("Checksum file missing, skipping checksum verification.");
  }

  // 2. Schema Validation
  if (!fs.existsSync(SCHEMA_FILE)) {
      console.error(`Schema file missing: ${SCHEMA_FILE}`);
      process.exit(1);
  }

  const schema = JSON.parse(fs.readFileSync(SCHEMA_FILE, 'utf-8'));
  const ajv = new Ajv();
  addFormats(ajv);

  const validate = ajv.compile(schema);
  const valid = validate(evidence);

  if (!valid) {
      console.error("Schema validation failed:", validate.errors);
      process.exit(1);
  }

  console.log("Schema validation passed.");

  // 3. Logic Validation (pass/fail)
  if (evidence.canary.overall_status !== 'pass') {
      console.error("Canary status is FAIL.");
      process.exit(1);
  }

  console.log("Verification SUCCESS.");
}

verifyEvidence();
