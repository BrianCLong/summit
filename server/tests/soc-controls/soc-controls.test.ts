import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

describe('SOC Control Verification', () => {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

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
    expect(workflowContent).toMatch(/sbom\.cdx\.json/);
  });

  test('SOC2-CC-2.2: Artifact signing is configured', () => {
    const workflowPath = path.join(repoRoot, '.github/workflows/_reusable-slsa-build.yml');
    const workflowContent = fs.readFileSync(workflowPath, 'utf8');

    expect(workflowContent).toMatch(/cosign sign/);
    expect(workflowContent).toMatch(/cosign attest/);
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
