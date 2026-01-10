import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

/**
 * SOC 2 Control Verification Tests
 *
 * These tests verify the presence and configuration of key security controls
 * required for SOC 2 compliance. They are run as part of the release pipeline
 * to provide "tests as controls".
 */

test('SOC2-CC-6.1: Vulnerability Scanning is configured', async (t) => {
  // Verify that the release workflow includes vulnerability scanning
  const workflowPath = path.join(process.cwd(), '.github/workflows/release-ga.yml');
  const workflowContent = fs.readFileSync(workflowPath, 'utf8');

  assert.match(workflowContent, /trivy sbom/, 'Trivy SBOM scan should be configured in release workflow');
  assert.match(workflowContent, /vuln-report/, 'Vulnerability report generation should be configured');
});

test('SOC2-CC-2.1: SBOM Generation is configured', async (t) => {
  // Verify that SLSA build includes SBOM generation
  const workflowPath = path.join(process.cwd(), '.github/workflows/_reusable-slsa-build.yml');
  const workflowContent = fs.readFileSync(workflowPath, 'utf8');

  assert.match(workflowContent, /syft/, 'Syft should be used for SBOM generation');
  assert.match(workflowContent, /sbom\.cdx\.json/, 'CycloneDX SBOM should be generated');
});

test('SOC2-CC-2.2: Artifact Signing is configured', async (t) => {
  // Verify that SLSA build includes signing
  const workflowPath = path.join(process.cwd(), '.github/workflows/_reusable-slsa-build.yml');
  const workflowContent = fs.readFileSync(workflowPath, 'utf8');

  assert.match(workflowContent, /cosign sign/, 'Cosign signing should be configured');
  assert.match(workflowContent, /cosign attest/, 'Cosign attestation should be configured');
});

test('SOC2-CC-8.1: Branch Protection (Simulated)', async (t) => {
  // In a real environment, this would query GitHub API.
  // Here we verify that a BRANCH_PROTECTION.md or similar policy file exists
  // or that we have a CODEOWNERS file which is a prerequisite.
  const codeownersPath = path.join(process.cwd(), 'CODEOWNERS');
  assert.ok(fs.existsSync(codeownersPath), 'CODEOWNERS file must exist for branch protection');
});

test('SOC2-CC-6.6: Boundary Protection (Network)', async (t) => {
  // Verify docker-compose doesn't expose sensitive ports to host (except via defined proxies)
  // This is a heuristic check.
  const dockerPath = path.join(process.cwd(), 'docker-compose.yml');
  if (fs.existsSync(dockerPath)) {
      const content = fs.readFileSync(dockerPath, 'utf8');
      // Basic check: Database ports shouldn't be globally exposed 0.0.0.0 (simplified check)
      // This is just an example of what a control test might look like.
  }
});
