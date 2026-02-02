import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '../../');
const resolvePath = (p: string) => path.join(repoRoot, p);

const FIXTURES_DIR = resolvePath('fixtures/governance');

function fail(message: string) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function success(message: string) {
  console.log(`✅ ${message}`);
}

function verifyFixtures() {
  console.log(`🔍 Verifying governance gate fixtures at: ${FIXTURES_DIR}`);

  const driftDetected = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, 'drift_detected.json'), 'utf-8'));
  const driftClear = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, 'drift_clear.json'), 'utf-8'));
  const authInvalid = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, 'authenticity_invalid.json'), 'utf-8'));
  const authVerified = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, 'authenticity_verified.json'), 'utf-8'));
  const checklistMissing = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, 'checklist_missing.json'), 'utf-8'));
  const checklistComplete = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, 'checklist_complete.json'), 'utf-8'));

  // 1. Compliance Drift Tests
  if (driftDetected.metadata.safeModeTriggered !== true || driftDetected.result !== 'DENY') {
    fail("Compliance Drift (Negative): Drift detected should trigger safe mode and DENY.");
  }
  if (driftClear.metadata.safeModeTriggered !== false || driftClear.result !== 'ALLOW') {
    fail("Compliance Drift (Positive): Drift clear should NOT trigger safe mode and ALLOW.");
  }
  success("summit-compliance-drift-tests passed.");

  // 2. Authenticity Gate Tests
  if (authInvalid.result !== 'DENY' || authInvalid.metadata.watermarkStatus !== 'invalid') {
    fail("Authenticity Gate (Negative): Invalid watermark should result in DENY.");
  }
  if (authVerified.result !== 'ALLOW' || authVerified.metadata.watermarkStatus !== 'present') {
    fail("Authenticity Gate (Positive): Verified authenticity should result in ALLOW.");
  }
  success("summit-authenticity-gate-tests passed.");

  // 3. Human-in-the-Loop Workflow Tests
  if (checklistMissing.status !== 'FAILED' || checklistMissing.metadata.checklist.attributionPresent !== false) {
    fail("HIL Workflow (Negative): Missing checklist step should result in FAILED status.");
  }
  if (checklistComplete.status !== 'COMPLETED' || checklistComplete.metadata.checklist.attributionPresent !== true) {
    fail("HIL Workflow (Positive): Complete checklist should result in COMPLETED status.");
  }
  success("summit-hil-workflow-tests passed.");

  success("All governance gate verifications completed successfully.");
}

verifyFixtures();
