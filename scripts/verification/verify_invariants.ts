#!/usr/bin/env node

/**
 * verify_invariants.ts
 *
 * Verifies the core system invariants and kill-switch functionality.
 * Designed to be deterministic and runner-agnostic.
 *
 * Usage: npx tsx scripts/verification/verify_invariants.ts
 */

import { strict as assert } from 'node:assert';
import { writeFileSync, mkdtempSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

// Resolve paths relative to this script
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..', '..');

// Import source modules directly.
// We use relative paths to ensure we test the actual source code.
// Note: .js extensions are required for ESM imports in TypeScript/Node
import { validateInvariants } from '../../server/src/provenance/invariants.js';
import { TenantKillSwitch } from '../../server/src/tenancy/killSwitch.js';

interface TestResult {
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

interface EvidenceArtifact {
  timestamp: string;
  verdict: 'PASS' | 'FAIL';
  suites: {
    name: string;
    tests: TestResult[];
  }[];
  environment: {
    nodeVersion: string;
    platform: string;
    ci: boolean;
  };
}

const results: EvidenceArtifact = {
  timestamp: new Date().toISOString(),
  verdict: 'PASS',
  suites: [],
  environment: {
    nodeVersion: process.version,
    platform: process.platform,
    ci: process.env.CI === '1' || process.env.CI === 'true',
  },
};

async function runSuite(name: string, tests: (() => void | Promise<void>)[]) {
  const suiteResults: TestResult[] = [];
  console.log(`\nRunning suite: ${name}`);

  for (const test of tests) {
    const testName = test.name || 'anonymous';
    const start = performance.now();
    let passed = false;
    let errorMsg: string | undefined;

    try {
      await test();
      passed = true;
      process.stdout.write(`  ✅ ${testName}\n`);
    } catch (e: any) {
      passed = false;
      errorMsg = e.message;
      process.stdout.write(`  ❌ ${testName}: ${e.message}\n`);
      results.verdict = 'FAIL';
    }

    suiteResults.push({
      name: testName,
      passed,
      durationMs: performance.now() - start,
      error: errorMsg,
    });
  }

  results.suites.push({ name, tests: suiteResults });
}

async function verifyProvenanceInvariants() {
  await runSuite('Provenance Invariants', [
    function shouldPassValidEntry() {
      const entry = {
        actionType: 'CREATE',
        timestamp: new Date().toISOString(),
        actorId: 'user:123',
        resourceId: 'doc:456',
        metadata: { correlationId: 'corr:789' },
      };
      validateInvariants(entry);
    },
    function shouldFailMissingActionType() {
      const entry = {
        timestamp: new Date().toISOString(),
        actorId: 'user:123',
        resourceId: 'doc:456',
        metadata: { correlationId: 'corr:789' },
      };
      try {
        validateInvariants(entry);
        throw new Error('Should have thrown');
      } catch (e: any) {
        assert.ok(e.message.includes('actionType'), 'Error should mention actionType');
      }
    },
    function shouldFailMissingTimestamp() {
      const entry = {
        actionType: 'CREATE',
        actorId: 'user:123',
        resourceId: 'doc:456',
        metadata: { correlationId: 'corr:789' },
      };
      try {
        validateInvariants(entry);
        throw new Error('Should have thrown');
      } catch (e: any) {
        assert.ok(e.message.includes('timestamp'), 'Error should mention timestamp');
      }
    },
    function shouldFailMissingActor() {
      const entry = {
        actionType: 'CREATE',
        timestamp: new Date().toISOString(),
        resourceId: 'doc:456',
        metadata: { correlationId: 'corr:789' },
      };
      try {
        validateInvariants(entry);
        throw new Error('Should have thrown');
      } catch (e: any) {
        assert.ok(e.message.includes('actor'), 'Error should mention actor');
      }
    },
    function shouldFailMissingResource() {
      const entry = {
        actionType: 'CREATE',
        timestamp: new Date().toISOString(),
        actorId: 'user:123',
        metadata: { correlationId: 'corr:789' },
      };
      try {
        validateInvariants(entry);
        throw new Error('Should have thrown');
      } catch (e: any) {
        assert.ok(e.message.includes('resource'), 'Error should mention resource');
      }
    },
    function shouldFailMissingCorrelationId() {
      const entry = {
        actionType: 'CREATE',
        timestamp: new Date().toISOString(),
        actorId: 'user:123',
        resourceId: 'doc:456',
        metadata: {},
      };
      try {
        validateInvariants(entry);
        throw new Error('Should have thrown');
      } catch (e: any) {
        assert.ok(e.message.includes('correlation_id'), 'Error should mention correlation_id');
      }
    },
  ]);
}

async function verifyKillSwitch() {
  await runSuite('Tenant Kill Switch', [
    function shouldDefaultToEnabled() {
        // Mock config file not existing
        const tempDir = mkdtempSync(join(tmpdir(), 'killswitch-test-'));
        const configPath = join(tempDir, 'tenant-killswitch.json');

        try {
            const ks = new TenantKillSwitch(configPath);
            assert.equal(ks.isDisabled('tenant-1'), false, 'Should be enabled (not disabled) by default');
        } finally {
            rmSync(tempDir, { recursive: true, force: true });
        }
    },
    function shouldRespectConfigFile() {
        const tempDir = mkdtempSync(join(tmpdir(), 'killswitch-test-'));
        const configPath = join(tempDir, 'tenant-killswitch.json');
        const config = { 'tenant-disabled': true, 'tenant-enabled': false };
        writeFileSync(configPath, JSON.stringify(config));

        try {
            const ks = new TenantKillSwitch(configPath);
            assert.equal(ks.isDisabled('tenant-disabled'), true, 'Should be disabled');
            assert.equal(ks.isDisabled('tenant-enabled'), false, 'Should be enabled');
            assert.equal(ks.isDisabled('tenant-unknown'), false, 'Unknown should be enabled');
        } finally {
            rmSync(tempDir, { recursive: true, force: true });
        }
    }
  ]);
}

async function main() {
  console.log('Starting Verification...');
  console.log('Root Dir:', ROOT_DIR);

  await verifyProvenanceInvariants();
  await verifyKillSwitch();

  const artifactsDir = join(ROOT_DIR, 'artifacts');
  if (!existsSync(artifactsDir)) {
      mkdirSync(artifactsDir, { recursive: true });
  }

  const artifactPath = join(artifactsDir, 'verification-evidence.json');
  writeFileSync(artifactPath, JSON.stringify(results, null, 2));
  console.log(`\nEvidence artifact written to: ${artifactPath}`);

  if (results.verdict === 'FAIL') {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
