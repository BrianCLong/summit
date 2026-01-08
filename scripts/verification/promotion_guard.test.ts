
import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import crypto from 'crypto';

const EVIDENCE_DIR = 'test/fixtures/evidence';
const MANIFEST_PATH = path.join(EVIDENCE_DIR, 'manifest.json');
const POLICY_PATH = path.resolve('release-policy.yml');

// Helper to create valid evidence pack
function createEvidencePack(dir: string, artifacts: Record<string, string>, manifestOverrides = {}) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const manifestArtifacts: Record<string, string> = {};

  for (const [name, content] of Object.entries(artifacts)) {
      const filePath = path.join(dir, name);
      fs.writeFileSync(filePath, content);
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      manifestArtifacts[name] = `sha256:${hash}`;
  }

  const manifest = {
      commit_sha: 'test-sha',
      created_at: new Date().toISOString(),
      artifacts: manifestArtifacts,
      ...manifestOverrides
  };

  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
}

test('Promotion Guard: RC Allowance', (t) => {
    const dir = path.join('test', 'temp', 'rc_valid');
    createEvidencePack(dir, {
        'checksums': 'checksum content',
        'build-shard-summary': JSON.stringify({ build: { status: 'success' }, test: { status: 'success' } }) // Assuming standard names or how script finds it
    });

    // We need to make sure the script finds the shard summary.
    // The script looks for "ga-verify-summary" or "shard-summary".
    const summaryPath = path.join(dir, 'ga-verify-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify({ build: { status: 'success' }, test: { status: 'success' } }));
    // Update manifest to include it
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
    const hash = crypto.createHash('sha256').update(fs.readFileSync(summaryPath)).digest('hex');
    manifest.artifacts['ga-verify-summary.json'] = `sha256:${hash}`;
    fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));

    try {
        const output = execSync(`npx tsx scripts/verification/promotion_guard.ts --channel rc --evidence-dir ${dir} --offline`, { encoding: 'utf8' });
        const result = JSON.parse(output);
        assert.strictEqual(result.decision, 'ALLOW');
    } catch (e) {
        console.error((e as any).stdout);
        assert.fail('Script failed');
    }
});

test('Promotion Guard: GA Denial due to missing resilience', (t) => {
    const dir = path.join('test', 'temp', 'ga_missing_resilience');
    createEvidencePack(dir, {
        'checksums': 'checksum content',
        'attestations': 'attestation content',
        'ga-verify-summary.json': JSON.stringify({ build: { status: 'success' }, test: { status: 'success' }, 'security-scan': { status: 'success' }, e2e: { status: 'success' } })
    });

    try {
        execSync(`npx tsx scripts/verification/promotion_guard.ts --channel ga --evidence-dir ${dir} --offline`, { encoding: 'utf8', stdio: 'pipe' });
        assert.fail('Should have failed');
    } catch (e: any) {
        const output = e.stdout.toString();
        const result = JSON.parse(output);
        assert.strictEqual(result.decision, 'DENY');
        assert.ok(result.reasons.some((r: any) => r.code === 'MISSING_DR_EVIDENCE'));
    }
});

test('Promotion Guard: Corrupted Evidence', (t) => {
    const dir = path.join('test', 'temp', 'corrupted');
    createEvidencePack(dir, {
        'checksums': 'checksum content'
    });

    // Corrupt file
    fs.writeFileSync(path.join(dir, 'checksums'), 'tampered content');

    try {
        execSync(`npx tsx scripts/verification/promotion_guard.ts --channel rc --evidence-dir ${dir} --offline`, { encoding: 'utf8', stdio: 'pipe' });
        assert.fail('Should have failed');
    } catch (e: any) {
        const output = e.stdout.toString();
        const result = JSON.parse(output);
        assert.strictEqual(result.decision, 'DENY');
        assert.ok(result.reasons.some((r: any) => r.code === 'EVIDENCE_Integrity'));
    }
});
