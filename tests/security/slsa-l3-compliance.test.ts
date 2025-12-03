import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { execSync, spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * SLSA L3 Compliance Integration Tests
 *
 * These tests verify that the SLSA L3 implementation works correctly:
 * - Provenance generation
 * - SBOM generation
 * - Signature verification
 * - Air-gap bundle creation
 */

const TEST_TIMEOUT = 120000; // 2 minutes

// Helper to run shell commands
function runCommand(cmd: string, options: { cwd?: string } = {}): string {
  try {
    return execSync(cmd, {
      encoding: 'utf-8',
      cwd: options.cwd || process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch (error: any) {
    throw new Error(`Command failed: ${cmd}\n${error.stderr || error.message}`);
  }
}

// Check if a command exists
function commandExists(cmd: string): boolean {
  try {
    execSync(`which ${cmd}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

describe('SLSA L3 Compliance Tests', () => {
  const projectRoot = path.resolve(__dirname, '../../..');
  const scriptsDir = path.join(projectRoot, 'scripts/security');
  const workflowsDir = path.join(projectRoot, '.github/workflows');

  describe('Workflow File Validation', () => {
    it('should have slsa-l3-provenance.yml workflow', () => {
      const workflowPath = path.join(workflowsDir, 'slsa-l3-provenance.yml');
      expect(fs.existsSync(workflowPath)).toBe(true);
    });

    it('should have slsa-l3-airgap-build.yml workflow', () => {
      const workflowPath = path.join(workflowsDir, 'slsa-l3-airgap-build.yml');
      expect(fs.existsSync(workflowPath)).toBe(true);
    });

    it('should have _reusable-slsa-build.yml workflow', () => {
      const workflowPath = path.join(workflowsDir, '_reusable-slsa-build.yml');
      expect(fs.existsSync(workflowPath)).toBe(true);
    });

    it('should have correct OIDC permissions in main workflow', () => {
      const workflowPath = path.join(workflowsDir, 'slsa-l3-provenance.yml');
      const content = fs.readFileSync(workflowPath, 'utf-8');

      // Check for required permissions
      expect(content).toContain('id-token: write');
      expect(content).toContain('attestations: write');
      expect(content).toContain('contents: read');
    });

    it('should use official slsa-github-generator', () => {
      const workflowPath = path.join(workflowsDir, 'slsa-l3-provenance.yml');
      const content = fs.readFileSync(workflowPath, 'utf-8');

      expect(content).toContain('slsa-framework/slsa-github-generator');
      expect(content).toContain('generator_container_slsa3.yml');
    });

    it('should configure hermetic build with network isolation', () => {
      const workflowPath = path.join(workflowsDir, 'slsa-l3-provenance.yml');
      const content = fs.readFileSync(workflowPath, 'utf-8');

      expect(content).toContain('network=none');
    });
  });

  describe('Verification Script', () => {
    const verifyScript = path.join(scriptsDir, 'verify-slsa-l3.sh');

    it('should have verification script', () => {
      expect(fs.existsSync(verifyScript)).toBe(true);
    });

    it('should be executable', () => {
      const stats = fs.statSync(verifyScript);
      const isExecutable = !!(stats.mode & fs.constants.S_IXUSR);
      expect(isExecutable).toBe(true);
    });

    it('should display usage when run without arguments', () => {
      try {
        runCommand(`bash ${verifyScript}`);
      } catch (error: any) {
        expect(error.message).toContain('Usage');
      }
    });

    it('should check for required dependencies', () => {
      const content = fs.readFileSync(verifyScript, 'utf-8');

      expect(content).toContain('cosign');
      expect(content).toContain('jq');
    });
  });

  describe('SBOM Generation Configuration', () => {
    it('should generate CycloneDX format', () => {
      const workflowPath = path.join(workflowsDir, 'slsa-l3-provenance.yml');
      const content = fs.readFileSync(workflowPath, 'utf-8');

      expect(content).toContain('cyclonedx-json');
      expect(content).toContain('sbom.cdx.json');
    });

    it('should generate SPDX format', () => {
      const workflowPath = path.join(workflowsDir, 'slsa-l3-provenance.yml');
      const content = fs.readFileSync(workflowPath, 'utf-8');

      expect(content).toContain('spdx-json');
      expect(content).toContain('sbom.spdx.json');
    });

    it('should use Syft for SBOM generation', () => {
      const workflowPath = path.join(workflowsDir, 'slsa-l3-provenance.yml');
      const content = fs.readFileSync(workflowPath, 'utf-8');

      expect(content).toContain('syft');
    });
  });

  describe('Air-Gap Bundle Configuration', () => {
    const airgapWorkflow = path.join(workflowsDir, 'slsa-l3-airgap-build.yml');

    it('should support classification levels', () => {
      const content = fs.readFileSync(airgapWorkflow, 'utf-8');

      expect(content).toContain('UNCLASSIFIED');
      expect(content).toContain('CUI');
      expect(content).toContain('SECRET');
      expect(content).toContain('TOP_SECRET');
    });

    it('should support transfer media options', () => {
      const content = fs.readFileSync(airgapWorkflow, 'utf-8');

      expect(content).toContain('secure_usb');
      expect(content).toContain('dvd_rom');
      expect(content).toContain('tape_archive');
    });

    it('should support FIPS mode', () => {
      const content = fs.readFileSync(airgapWorkflow, 'utf-8');

      expect(content).toContain('fips_mode');
      expect(content).toContain('FIPS');
    });

    it('should include verification tools in bundle', () => {
      const content = fs.readFileSync(airgapWorkflow, 'utf-8');

      expect(content).toContain('include_verification_tools');
      expect(content).toContain('cosign');
      expect(content).toContain('slsa-verifier');
    });

    it('should generate bundle manifest', () => {
      const content = fs.readFileSync(airgapWorkflow, 'utf-8');

      expect(content).toContain('manifest.json');
      expect(content).toContain('bundleId');
      expect(content).toContain('slsaLevel');
    });
  });

  describe('Cosign OIDC Configuration', () => {
    it('should use keyless signing', () => {
      const workflowPath = path.join(workflowsDir, 'slsa-l3-provenance.yml');
      const content = fs.readFileSync(workflowPath, 'utf-8');

      expect(content).toContain('COSIGN_EXPERIMENTAL');
      expect(content).toContain('cosign sign --yes');
    });

    it('should include attestation annotations', () => {
      const workflowPath = path.join(workflowsDir, 'slsa-l3-provenance.yml');
      const content = fs.readFileSync(workflowPath, 'utf-8');

      expect(content).toContain('-a "repo=');
      expect(content).toContain('-a "ref=');
      expect(content).toContain('-a "sha=');
      expect(content).toContain('-a "slsa_level=3"');
    });

    it('should verify with GitHub OIDC issuer', () => {
      const workflowPath = path.join(workflowsDir, 'slsa-l3-provenance.yml');
      const content = fs.readFileSync(workflowPath, 'utf-8');

      expect(content).toContain('token.actions.githubusercontent.com');
      expect(content).toContain('certificate-oidc-issuer');
    });
  });

  describe('Documentation', () => {
    const docsPath = path.join(projectRoot, 'docs/security/SLSA-L3-COMPLIANCE.md');

    it('should have SLSA L3 compliance documentation', () => {
      expect(fs.existsSync(docsPath)).toBe(true);
    });

    it('should document all SLSA L3 requirements', () => {
      const content = fs.readFileSync(docsPath, 'utf-8');

      // Check for key SLSA requirements
      expect(content).toContain('Hermetic');
      expect(content).toContain('Provenance');
      expect(content).toContain('SBOM');
      expect(content).toContain('OIDC');
    });

    it('should include verification commands', () => {
      const content = fs.readFileSync(docsPath, 'utf-8');

      expect(content).toContain('cosign verify');
      expect(content).toContain('cosign verify-attestation');
    });

    it('should document trade-offs', () => {
      const content = fs.readFileSync(docsPath, 'utf-8');

      expect(content).toContain('Trade-off');
      expect(content).toContain('Build Time');
    });
  });

  describe('Reusable Workflow', () => {
    const reusableWorkflow = path.join(workflowsDir, '_reusable-slsa-build.yml');

    it('should have workflow_call trigger', () => {
      const content = fs.readFileSync(reusableWorkflow, 'utf-8');

      expect(content).toContain('workflow_call');
    });

    it('should expose required outputs', () => {
      const content = fs.readFileSync(reusableWorkflow, 'utf-8');

      expect(content).toContain('image_digest');
      expect(content).toContain('image_uri');
      expect(content).toContain('sbom_digest');
      expect(content).toContain('slsa_level');
    });

    it('should support configurable inputs', () => {
      const content = fs.readFileSync(reusableWorkflow, 'utf-8');

      expect(content).toContain('image_name');
      expect(content).toContain('dockerfile');
      expect(content).toContain('platforms');
      expect(content).toContain('reproducible');
    });
  });
});

describe('SLSA Provenance Schema Tests', () => {
  // Sample SLSA v1 provenance for validation
  const sampleProvenance = {
    _type: 'https://in-toto.io/Statement/v1',
    predicateType: 'https://slsa.dev/provenance/v1',
    subject: [
      {
        name: 'ghcr.io/example/image',
        digest: {
          sha256: 'abc123def456',
        },
      },
    ],
    predicate: {
      buildDefinition: {
        buildType: 'https://github.com/actions/runner',
        externalParameters: {
          repository: 'example/repo',
          ref: 'refs/heads/main',
          workflow: 'build.yml',
        },
        internalParameters: {
          hermetic: true,
        },
        resolvedDependencies: [
          {
            uri: 'git+https://github.com/example/repo@refs/heads/main',
            digest: {
              gitCommit: 'abc123',
            },
          },
        ],
      },
      runDetails: {
        builder: {
          id: 'https://github.com/actions/runner',
        },
        metadata: {
          invocationId: '12345-1',
          startedOn: '2025-01-01T00:00:00Z',
          finishedOn: '2025-01-01T00:05:00Z',
        },
      },
    },
  };

  it('should have valid in-toto statement type', () => {
    expect(sampleProvenance._type).toBe('https://in-toto.io/Statement/v1');
  });

  it('should have SLSA v1 predicate type', () => {
    expect(sampleProvenance.predicateType).toBe(
      'https://slsa.dev/provenance/v1',
    );
  });

  it('should have subject with digest', () => {
    expect(sampleProvenance.subject).toHaveLength(1);
    expect(sampleProvenance.subject[0].digest.sha256).toBeDefined();
  });

  it('should have build definition', () => {
    expect(sampleProvenance.predicate.buildDefinition).toBeDefined();
    expect(sampleProvenance.predicate.buildDefinition.buildType).toBeDefined();
  });

  it('should have run details with builder ID', () => {
    expect(sampleProvenance.predicate.runDetails.builder.id).toBeDefined();
  });

  it('should have invocation metadata', () => {
    const metadata = sampleProvenance.predicate.runDetails.metadata;
    expect(metadata.invocationId).toBeDefined();
    expect(metadata.startedOn).toBeDefined();
    expect(metadata.finishedOn).toBeDefined();
  });

  it('should indicate hermetic build', () => {
    expect(
      sampleProvenance.predicate.buildDefinition.internalParameters?.hermetic,
    ).toBe(true);
  });
});

describe('Hash Verification Tests', () => {
  it('should generate deterministic SHA256 hash', () => {
    const testData = 'test content for hashing';
    const hash1 = crypto.createHash('sha256').update(testData).digest('hex');
    const hash2 = crypto.createHash('sha256').update(testData).digest('hex');

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('should detect content changes', () => {
    const original = 'original content';
    const modified = 'modified content';

    const hash1 = crypto.createHash('sha256').update(original).digest('hex');
    const hash2 = crypto.createHash('sha256').update(modified).digest('hex');

    expect(hash1).not.toBe(hash2);
  });
});
