import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const getGitSha = () => {
    try {
        return execSync('git rev-parse HEAD').toString().trim();
    } catch (e) {
        return 'dev';
    }
};

const SHA = process.env.GITHUB_SHA || getGitSha();
// Allow overriding artifact dir for testing
const ARTIFACTS_DIR = process.env.ARTIFACTS_DIR || `artifacts/evidence/post-deploy/${SHA}`;
const CANARY_FILE = path.join(ARTIFACTS_DIR, 'canary.json');
const SLO_FILE = path.join(ARTIFACTS_DIR, 'slo_snapshot.json');
const OUTPUT_FILE = path.join(ARTIFACTS_DIR, 'evidence.json');
const CHECKSUM_FILE = path.join(ARTIFACTS_DIR, 'checksums.txt');

function generateEvidence() {
  console.log(`Generating evidence in ${ARTIFACTS_DIR}...`);
  if (!fs.existsSync(CANARY_FILE)) {
    console.error(`Canary file not found: ${CANARY_FILE}`);
    process.exit(1);
  }

  const canaryData = JSON.parse(fs.readFileSync(CANARY_FILE, 'utf-8'));
  let sloData = undefined;

  if (fs.existsSync(SLO_FILE)) {
    try {
        sloData = JSON.parse(fs.readFileSync(SLO_FILE, 'utf-8'));
    } catch (e) {
        console.warn("Failed to parse SLO snapshot, ignoring.");
    }
  }

  const evidence = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    commit_sha: SHA,
    canary: canaryData,
    slo_snapshot: sloData
  };

  const jsonContent = JSON.stringify(evidence, null, 2);
  fs.writeFileSync(OUTPUT_FILE, jsonContent);
  console.log(`Generated evidence at: ${OUTPUT_FILE}`);

  // Generate Checksum
  const hash = crypto.createHash('sha256').update(jsonContent).digest('hex');
  const checksumContent = `${hash}  evidence.json\n`;
  fs.writeFileSync(CHECKSUM_FILE, checksumContent);
  console.log(`Generated checksum at: ${CHECKSUM_FILE}`);
}

generateEvidence();
