import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const BUNDLE_PATH = path.resolve(process.cwd(), 'evidence/out/evidence-bundle.json');
const GENERATE_CMD = 'npx tsx scripts/evidence/generate_evidence_bundle.ts';
const VERIFY_CMD = 'npx tsx scripts/evidence/verify_evidence_bundle.ts';

describe('Evidence Bundle System', () => {
  // Ensure we start clean
  if (fs.existsSync(BUNDLE_PATH)) {
    fs.unlinkSync(BUNDLE_PATH);
  }

  it('should generate a valid evidence bundle', () => {
    execSync(GENERATE_CMD);
    assert.ok(fs.existsSync(BUNDLE_PATH), 'Evidence bundle file should exist');
  });

  it('should verify the generated bundle successfully', () => {
    try {
        execSync(VERIFY_CMD);
    } catch (e) {
        assert.fail('Verification failed for a valid bundle');
    }
  });

  it('should fail verification if bundle is modified invalidly', () => {
    const originalContent = fs.readFileSync(BUNDLE_PATH, 'utf-8');
    const bundle = JSON.parse(originalContent);

    // Invalidate schema
    delete bundle.provenance;

    fs.writeFileSync(BUNDLE_PATH, JSON.stringify(bundle));

    try {
        execSync(VERIFY_CMD, { stdio: 'ignore' });
        assert.fail('Verification should have failed');
    } catch (e) {
        assert.ok(true, 'Verification correctly failed');
    }

    // Restore
    fs.writeFileSync(BUNDLE_PATH, originalContent);
  });

  it('should fail verification if schema version is wrong', () => {
     const originalContent = fs.readFileSync(BUNDLE_PATH, 'utf-8');
     const bundle = JSON.parse(originalContent);

     bundle.schemaVersion = '99.99.99';
     fs.writeFileSync(BUNDLE_PATH, JSON.stringify(bundle));

     try {
         execSync(VERIFY_CMD, { stdio: 'ignore' });
         assert.fail('Verification should have failed');
     } catch (e) {
         assert.ok(true, 'Verification correctly failed');
     }

     fs.writeFileSync(BUNDLE_PATH, originalContent);
  });
});
