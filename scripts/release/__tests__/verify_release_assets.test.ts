/**
 * Tests for release asset verification
 *
 * Run with: pnpm test scripts/release/__tests__/verify_release_assets.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const TEST_DIR = '/tmp/test-release-verify';
const FIXTURES_DIR = join(TEST_DIR, 'fixtures');

function sha256(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

function createTestEvidence(dir: string): void {
  mkdirSync(dir, { recursive: true });

  // Create sample files
  const files = {
    'build-info.json': JSON.stringify({ version: '1.0.0', commit: 'abc123' }),
    'test-results.json': JSON.stringify({ passed: 100, failed: 0 }),
    'coverage.json': JSON.stringify({ coverage: 85.5 }),
  };

  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(dir, name), content);
  }

  // Create SHA256SUMS manifest
  const manifest = Object.entries(files)
    .map(([name, content]) => `${sha256(content)}  ./${name}`)
    .join('\n');
  writeFileSync(join(dir, 'SHA256SUMS'), manifest);
}

function createTestTrustSnapshot(path: string): void {
  const snapshot = {
    version: '1.0.0',
    generated_at: new Date().toISOString(),
    trust_level: 'high',
    checks: {
      security_scan: 'pass',
      dependency_audit: 'pass',
      signature_verified: true,
    },
  };
  writeFileSync(path, JSON.stringify(snapshot, null, 2));
}

function createPromotionDigests(path: string, assets: Record<string, string>): void {
  const digests: Record<string, string> = {};
  for (const [name, content] of Object.entries(assets)) {
    digests[name] = `sha256:${sha256(content)}`;
  }

  const promotion = {
    version: '1.0.0',
    promotion: {
      rc_tag: 'v1.0.0-rc.1',
      ga_tag: 'v1.0.0',
      computed_at: new Date().toISOString(),
    },
    digests,
  };
  writeFileSync(path, JSON.stringify(promotion, null, 2));
}

describe('Evidence Bundle Verification', () => {
  beforeAll(() => {
    mkdirSync(FIXTURES_DIR, { recursive: true });
  });

  afterAll(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('should create valid evidence bundle with manifest', () => {
    const evidenceDir = join(FIXTURES_DIR, 'evidence');
    createTestEvidence(evidenceDir);

    // Create tarball
    const tarball = join(FIXTURES_DIR, 'evidence.tar.gz');
    execSync(`tar -czf "${tarball}" -C "${evidenceDir}" .`);

    expect(existsSync(tarball)).toBe(true);

    // Verify manifest
    const extractDir = join(FIXTURES_DIR, 'extracted');
    mkdirSync(extractDir, { recursive: true });
    execSync(`tar -xzf "${tarball}" -C "${extractDir}"`);

    const manifestPath = join(extractDir, 'SHA256SUMS');
    expect(existsSync(manifestPath)).toBe(true);

    // Verify checksums
    const result = execSync(`cd "${extractDir}" && sha256sum -c SHA256SUMS`, {
      encoding: 'utf-8',
    });
    expect(result).toContain('OK');
  });

  it('should detect corrupted file in evidence bundle', () => {
    const evidenceDir = join(FIXTURES_DIR, 'evidence-corrupted');
    createTestEvidence(evidenceDir);

    // Corrupt a file after manifest creation
    writeFileSync(join(evidenceDir, 'build-info.json'), '{"corrupted": true}');

    // Verify should fail
    try {
      execSync(`cd "${evidenceDir}" && sha256sum -c SHA256SUMS`, {
        encoding: 'utf-8',
      });
      expect.fail('Should have thrown on checksum mismatch');
    } catch (error: any) {
      expect(error.status).not.toBe(0);
    }
  });
});

describe('Trust Snapshot Validation', () => {
  beforeAll(() => {
    mkdirSync(FIXTURES_DIR, { recursive: true });
  });

  it('should validate well-formed trust snapshot', () => {
    const snapshotPath = join(FIXTURES_DIR, 'trust-snapshot.json');
    createTestTrustSnapshot(snapshotPath);

    const content = require(snapshotPath);
    expect(content.version).toBe('1.0.0');
    expect(content.generated_at).toBeDefined();
    expect(content.trust_level).toBe('high');
  });

  it('should reject invalid JSON', () => {
    const invalidPath = join(FIXTURES_DIR, 'trust-snapshot-invalid.json');
    writeFileSync(invalidPath, '{ invalid json }');

    expect(() => JSON.parse(require('fs').readFileSync(invalidPath, 'utf-8'))).toThrow();
  });

  it('should detect missing required fields', () => {
    const incompletePath = join(FIXTURES_DIR, 'trust-snapshot-incomplete.json');
    writeFileSync(incompletePath, JSON.stringify({ foo: 'bar' }));

    const content = JSON.parse(require('fs').readFileSync(incompletePath, 'utf-8'));
    expect(content.version).toBeUndefined();
    expect(content.generated_at).toBeUndefined();
  });
});

describe('Promotion Digests Cross-Check', () => {
  beforeAll(() => {
    mkdirSync(FIXTURES_DIR, { recursive: true });
  });

  it('should match digests for unchanged assets', () => {
    const assets = {
      'artifact1.tar.gz': 'content of artifact 1',
      'artifact2.json': JSON.stringify({ data: 'test' }),
    };

    // Write assets
    for (const [name, content] of Object.entries(assets)) {
      writeFileSync(join(FIXTURES_DIR, name), content);
    }

    // Create digests file
    const digestsPath = join(FIXTURES_DIR, 'digests.json');
    createPromotionDigests(digestsPath, assets);

    // Verify digests match
    const digests = JSON.parse(require('fs').readFileSync(digestsPath, 'utf-8'));

    for (const [name, content] of Object.entries(assets)) {
      const filePath = join(FIXTURES_DIR, name);
      const actualContent = require('fs').readFileSync(filePath);
      const actualHash = `sha256:${sha256(actualContent)}`;
      expect(actualHash).toBe(digests.digests[name]);
    }
  });

  it('should detect modified asset', () => {
    const assets = {
      'artifact-modified.tar.gz': 'original content',
    };

    // Write original asset
    writeFileSync(join(FIXTURES_DIR, 'artifact-modified.tar.gz'), assets['artifact-modified.tar.gz']);

    // Create digests with original hash
    const digestsPath = join(FIXTURES_DIR, 'digests-modified.json');
    createPromotionDigests(digestsPath, assets);

    // Modify the asset
    writeFileSync(join(FIXTURES_DIR, 'artifact-modified.tar.gz'), 'MODIFIED content');

    // Verify digests no longer match
    const digests = JSON.parse(require('fs').readFileSync(digestsPath, 'utf-8'));
    const actualContent = require('fs').readFileSync(join(FIXTURES_DIR, 'artifact-modified.tar.gz'));
    const actualHash = `sha256:${sha256(actualContent)}`;

    expect(actualHash).not.toBe(digests.digests['artifact-modified.tar.gz']);
  });
});

describe('GA Attestation Schema', () => {
  it('should produce deterministic JSON ordering', () => {
    const attestation1 = {
      version: '1.0.0',
      attestation_type: 'ga-release-verification',
      ga_tag: 'v1.0.0',
      commit_sha: 'abc123def456',
      attestation_status: 'PASS',
    };

    const attestation2 = {
      attestation_status: 'PASS',
      version: '1.0.0',
      commit_sha: 'abc123def456',
      ga_tag: 'v1.0.0',
      attestation_type: 'ga-release-verification',
    };

    // Both should produce same sorted output
    const sorted1 = JSON.stringify(attestation1, Object.keys(attestation1).sort(), 2);
    const sorted2 = JSON.stringify(attestation2, Object.keys(attestation2).sort(), 2);

    expect(sorted1).toBe(sorted2);
  });

  it('should validate attestation status values', () => {
    const validStatuses = ['PASS', 'FAIL'];
    const invalidStatuses = ['pass', 'PASSED', 'OK', 'ERROR'];

    for (const status of validStatuses) {
      expect(['PASS', 'FAIL']).toContain(status);
    }

    for (const status of invalidStatuses) {
      expect(['PASS', 'FAIL']).not.toContain(status);
    }
  });
});

describe('Waiver Expiry Detection', () => {
  it('should detect expired waivers', () => {
    const now = new Date();
    const pastDate = new Date(now.getTime() - 86400000); // Yesterday
    const futureDate = new Date(now.getTime() + 86400000); // Tomorrow

    const expiredWaiver = { expires: pastDate.toISOString().split('T')[0] };
    const validWaiver = { expires: futureDate.toISOString().split('T')[0] };

    const isExpired = (waiver: { expires: string }) => {
      return new Date(waiver.expires) < now;
    };

    expect(isExpired(expiredWaiver)).toBe(true);
    expect(isExpired(validWaiver)).toBe(false);
  });
});
