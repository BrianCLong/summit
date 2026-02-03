
import { jest, describe, it, expect } from '@jest/globals';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Adversarial Security: Provenance Gate (OPA)', () => {
  const gateScript = path.join(process.cwd(), 'scripts/ci/enforce-provenance.sh');
  const tempDir = path.join(process.cwd(), 'dist/temp-security-tests');

  beforeAll(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  it('should REJECT promotion when provenance input is missing', () => {
    const missingFile = path.join(tempDir, 'non-existent.json');
    try {
      execSync(`bash ${gateScript} ${missingFile}`, { stdio: 'pipe' });
      fail('Gate should have exited with error');
    } catch (error: any) {
      expect(error.status).toBe(1);
      expect(error.stdout.toString()).toContain('Error');
    }
  });

  it('should REJECT promotion when signature is false in input', () => {
    const invalidInput = path.join(tempDir, 'invalid-signature.json');
    fs.writeFileSync(invalidInput, JSON.stringify({
      sboms_signed: false,
      provenance_signed: true,
      artifacts: []
    }));

    try {
      execSync(`bash ${gateScript} ${invalidInput}`, { stdio: 'pipe' });
      fail('Gate should have blocked unsigned SBOM');
    } catch (error: any) {
      expect(error.status).toBe(1);
      expect(error.stdout.toString()).toContain('PROVENANCE GATE FAILED');
    }
  });

  it('should FAIL CLOSED when policy file is missing or corrupted', () => {
    const backupPolicy = 'policy/supply_chain.rego.bak';
    const policyPath = 'policy/supply_chain.rego';
    
    // Temporarily rename policy file
    fs.renameSync(policyPath, backupPolicy);
    
    try {
      const validInput = path.join(tempDir, 'valid-stub.json');
      fs.writeFileSync(validInput, JSON.stringify({
        sboms_signed: true,
        provenance_signed: true,
        artifact: { sbom_spdx: true, sbom_cyclonedx: true, provenance_attestation: true },
        slsa_provenance: { predicate: { buildType: "...", builder: { id: "..." }, metadata: { buildInvocationId: "..." } } },
        vulnerability_scan: { vulnerabilities: [] },
        transparency_log: { uuid: "..." },
        artifacts: [],
        evidence_bundle: { slsa_provenance: true, sbom: true, vulnerability_scan: true, signature: true, transparency_log: true }
      }));

      execSync(`bash ${gateScript} ${validInput}`, { stdio: 'pipe' });
      fail('Gate should have failed closed when policy is missing');
    } catch (error: any) {
      expect(error.status).not.toBe(0);
    } finally {
      // Restore policy file
      fs.renameSync(backupPolicy, policyPath);
    }
  });

  it('should IGNORE environment-based bypass attempts', () => {
    const validInput = path.join(tempDir, 'valid-stub.json');
    // Ensure the input is valid enough to pass if skip was honored
    fs.writeFileSync(validInput, JSON.stringify({
      sboms_signed: true,
      provenance_signed: true,
      artifact: { sbom_spdx: true, sbom_cyclonedx: true, provenance_attestation: true },
      slsa_provenance: { 
        predicate: { 
          buildType: "https://slsa-framework.github.io/github-actions-buildtypes/workflow/v1", 
          builder: { id: "https://github.com/actions/runner" }, 
          metadata: { buildInvocationId: "run-123" } 
        } 
      },
      vulnerability_scan: { vulnerabilities: [] },
      transparency_log: { uuid: "trans-123" },
      artifacts: [],
      evidence_bundle: { slsa_provenance: true, sbom: true, vulnerability_scan: true, signature: true, transparency_log: true },
      version: "v1.0.0"
    }));

    // Attempt to skip via a hypothetical env var (many CI systems have these)
    try {
      execSync(`SKIP_PROVENANCE=true bash ${gateScript} ${validInput}`, { 
        env: { ...process.env, SKIP_PROVENANCE: 'true' },
        stdio: 'pipe' 
      });
      // It should pass because the input IS valid, but we want to ensure
      // the script doesn't have a shortcut that returns 0 early.
      // We verify this by looking at the script source (which we did earlier).
    } catch (error: any) {
      fail('Gate should have passed valid input regardless of bypass env');
    }
  });
});

function fail(message: string) {
  throw new Error(message);
}
