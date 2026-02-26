import fs from 'fs';
import path from 'path';

describe('SOC Control Verification', () => {
  // Use process.cwd() assuming the test is run from the server directory or root
  // Ideally, find the root by looking for package.json or .git
  const repoRoot = path.resolve(__dirname, '..', '..', '..');

  test('SOC2-CC-6.1: Vulnerability scanning is configured', () => {
    const workflowPath = path.join(repoRoot, '.github/workflows/release-ga-pipeline.yml');
    const workflowContent = fs.readFileSync(workflowPath, 'utf8');

    expect(workflowContent).toMatch(/scan_secrets\.sh/);
    expect(workflowContent).toMatch(/security_audit_gate\.mjs/);
  });

  test('SOC2-CC-2.1: SBOM generation is configured', () => {
    const workflowPath = path.join(repoRoot, '.github/workflows/_reusable-slsa-build.yml');
    const workflowContent = fs.readFileSync(workflowPath, 'utf8');

    expect(workflowContent).toMatch(/syft/);
    // Updated expectation to match actual artifact name (sbom.cyclonedx.json or sbom.spdx.json)
    // The previous expectation /sbom\.cdx\.json/ was too specific or incorrect for the mv command
    expect(workflowContent).toMatch(/sbom\.(cyclonedx|spdx)\.json/);
  });

  test('SOC2-CC-2.2: Artifact signing is configured', () => {
    const workflowPath = path.join(repoRoot, '.github/workflows/_reusable-slsa-build.yml');
    const workflowContent = fs.readFileSync(workflowPath, 'utf8');

    expect(workflowContent).toMatch(/cosign sign/);
    // Accept either direct cosign attest command OR usage of the official attest actions
    const hasCosignAttest = /cosign attest/.test(workflowContent);
    const hasAttestAction = /actions\/attest-(build-provenance|sbom)/.test(workflowContent);

    expect(hasCosignAttest || hasAttestAction).toBe(true);
  });

  test('SOC2-CC-8.1: Branch protection policy prerequisite exists', () => {
    const codeownersPath = path.join(repoRoot, 'CODEOWNERS');
    expect(fs.existsSync(codeownersPath)).toBe(true);
  });

  test('SOC2-CC-6.6: Boundary protection policy is present', () => {
    const policyPath = path.join(repoRoot, 'SECURITY_GA_GATE.md');
    expect(fs.existsSync(policyPath)).toBe(true);
  });
});
