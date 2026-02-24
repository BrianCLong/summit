import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import os from 'node:os';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'evidence-test-'));
const policyPath = path.join(tmpDir, 'policy.yml');
const waiversPath = path.join(tmpDir, 'waivers.yml');
const evidenceDir = path.join(tmpDir, 'evidence');
const keysDir = path.join(tmpDir, 'keys');
const pubKeyPath = path.join(keysDir, 'minisign.pub');

fs.mkdirSync(evidenceDir);
fs.mkdirSync(keysDir);

// Setup policy
fs.writeFileSync(policyPath, `
allowed_ids:
  - ALLOWED-001
require_signature: true
sig_algos: [ed25519]
public_keys:
  - ${pubKeyPath}
require_subject_sha256: true
require_each_allowed_id: true
`);

fs.writeFileSync(waiversPath, "waivers: []");
fs.writeFileSync(pubKeyPath, "fake-public-key");

const scriptPath = path.resolve('scripts/ci/verify_evidence_policy.mjs');

function run(evidenceFiles, env = {}) {
  // Clear evidence dir
  fs.readdirSync(evidenceDir).forEach(f => fs.unlinkSync(path.join(evidenceDir, f)));

  // Write evidence
  for (const [name, content] of Object.entries(evidenceFiles)) {
    fs.writeFileSync(path.join(evidenceDir, name), JSON.stringify(content));
    if (content.id) { // Create fake sig
       fs.writeFileSync(path.join(evidenceDir, `${name}.minisig`), "fake-sig");
    }
  }

  try {
    const output = execFileSync('node', [scriptPath, '--policy', policyPath, '--dir', evidenceDir, '--waivers', waiversPath], {
      env: { ...process.env, ...env, MOCK_MINISIGN: 'true' },
      encoding: 'utf8',
      stdio: 'pipe'
    });
    return { code: 0, output };
  } catch (e) {
    return { code: e.status, output: e.stderr + e.stdout };
  }
}

// Tests
console.log("Running tests...");

// Test 1: Valid evidence
const res1 = run({
  'valid.json': { id: 'ALLOWED-001', subject: { sha256: 'abc' } }
});
if (res1.code !== 0) throw new Error(`Test 1 Failed: Should pass. Output: ${res1.output}`);
console.log("Test 1 Passed: Valid evidence");

// Test 2: Unknown ID
const res2 = run({
  'bad.json': { id: 'UNKNOWN-001', subject: { sha256: 'abc' } }
});
if (res2.code === 0) throw new Error("Test 2 Failed: Should fail on unknown ID");
if (!res2.output.includes("Unknown evidence id")) throw new Error(`Test 2 Failed: Wrong error message. Output: ${res2.output}`);
console.log("Test 2 Passed: Unknown ID");

// Test 3: Missing SHA256
const res3 = run({
  'valid.json': { id: 'ALLOWED-001', subject: {} }
});
if (res3.code === 0) throw new Error("Test 3 Failed: Should fail on missing sha256");
if (!res3.output.includes("Missing subject.sha256")) throw new Error(`Test 3 Failed: Wrong error message. Output: ${res3.output}`);
console.log("Test 3 Passed: Missing SHA256");

// Test 4: Missing Required ID
// Update policy to require 2 IDs
fs.writeFileSync(policyPath, `
allowed_ids:
  - ALLOWED-001
  - ALLOWED-002
require_signature: true
public_keys:
  - ${pubKeyPath}
require_subject_sha256: true
require_each_allowed_id: true
`);

const res4 = run({
  'valid.json': { id: 'ALLOWED-001', subject: { sha256: 'abc' } }
});
if (res4.code === 0) throw new Error("Test 4 Failed: Should fail on missing ID");
if (!res4.output.includes("Missing required evidence IDs: ALLOWED-002")) throw new Error(`Test 4 Failed: Wrong error message. Output: ${res4.output}`);
console.log("Test 4 Passed: Missing Required ID");

// Test 5: Waiver
fs.writeFileSync(waiversPath, `
waivers:
  - id: ALLOWED-002
`);
const res5 = run({
  'valid.json': { id: 'ALLOWED-001', subject: { sha256: 'abc' } }
});
if (res5.code !== 0) throw new Error(`Test 5 Failed: Should pass with waiver. Output: ${res5.output}`);
console.log("Test 5 Passed: Waiver");

console.log("All tests passed!");
fs.rmSync(tmpDir, { recursive: true, force: true });
