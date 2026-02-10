/**
 * Switchboard Capsule Tests
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CapsuleLedger, verifyLedger } from '../src/lib/switchboard-ledger.js';
import { runCapsule } from '../src/lib/switchboard-runner.js';
import { generateEvidenceBundle } from '../src/lib/switchboard-evidence.js';
import { replayCapsule } from '../src/lib/switchboard-replay.js';

describe('Switchboard Capsules', () => {
  it('verifies hash chain integrity', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'capsule-ledger-'));
    const ledger = new CapsuleLedger(tempDir, 'session-test');
    ledger.append('policy_decision', { allow: true });
    ledger.append('tool_exec', { command: 'node' });

    const ledgerPath = path.join(tempDir, 'ledger.jsonl');
    const verified = verifyLedger(ledgerPath);
    expect(verified.valid).toBe(true);

    const contents = fs.readFileSync(ledgerPath, 'utf8');
    fs.writeFileSync(ledgerPath, contents.replace('tool_exec', 'tool-xec'), 'utf8');

    const tampered = verifyLedger(ledgerPath);
    expect(tampered.valid).toBe(false);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('runs, bundles evidence, and replays deterministically', async () => {
    const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'capsule-run-'));
    fs.writeFileSync(path.join(repoRoot, 'README.md'), 'Capsule README', 'utf8');

    const manifestPath = path.join(repoRoot, 'capsule.yaml');
    const manifest = `version: v2
allowed_paths:
  read:
    - README.md
  write:
    - out/result.txt
allowed_commands:
  - node
network_mode: off
env_allowlist:
  - PATH
steps:
  - id: write-result
    command: node
    args:
      - -e
      - "const fs=require('fs');fs.mkdirSync('out',{recursive:true});fs.writeFileSync('out/result.txt','ok');console.log('done');"
    writes:
      - out/result.txt
  - id: test-step
    command: node
    args:
      - -e
      - "process.exit(0)"
    category: test
`;
    fs.writeFileSync(manifestPath, manifest, 'utf8');

    const runResult = await runCapsule({
      manifestPath,
      repoRoot,
    });
    expect(runResult.status).toBe('completed');

    const evidence = generateEvidenceBundle(repoRoot, runResult.sessionId, 'pro');
    expect(fs.existsSync(evidence.ledgerPath)).toBe(true);
    expect(fs.existsSync(evidence.diffPath)).toBe(true);
    expect(
      fs.existsSync(path.join(evidence.evidenceDir, 'ledger-verification.json'))
    ).toBe(true);

    const replayReport = await replayCapsule(repoRoot, runResult.sessionId);
    expect(replayReport.match).toBe(true);
    expect(replayReport.ledger_validations.original_valid).toBe(true);
    expect(replayReport.ledger_validations.replay_valid).toBe(true);

    fs.rmSync(repoRoot, { recursive: true, force: true });
  });
});
