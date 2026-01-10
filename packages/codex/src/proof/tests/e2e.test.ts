import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { generateProof } from '../builder.js';
import { verifyProof } from '../verifier.js';
import { join } from 'node:path';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';

const TEST_PKG_DIR = join(process.cwd(), 'packages/codex/src/proof/tests/fixtures/test-pkg');
const TEST_OUT_DIR = join(TEST_PKG_DIR, 'dist');

describe('End-to-End Proof Generation and Verification', () => {
  beforeEach(() => {
    // Setup clean environment
    if (existsSync(TEST_PKG_DIR)) rmSync(TEST_PKG_DIR, { recursive: true, force: true });
    mkdirSync(TEST_PKG_DIR, { recursive: true });
    mkdirSync(TEST_OUT_DIR, { recursive: true });

    // Create package.json
    writeFileSync(join(TEST_PKG_DIR, 'package.json'), JSON.stringify({ name: 'test-pkg', version: '1.0.0' }));

    // Create source file
    writeFileSync(join(TEST_PKG_DIR, 'index.js'), 'console.log("hello");');

    // Create output artifact
    writeFileSync(join(TEST_OUT_DIR, 'index.js'), 'console.log("hello");');
  });

  afterEach(() => {
    // Cleanup
    if (existsSync(TEST_PKG_DIR)) rmSync(TEST_PKG_DIR, { recursive: true, force: true });
    const proofDir = join(process.cwd(), '.summit/proofs/test-pkg');
    if (existsSync(proofDir)) rmSync(proofDir, { recursive: true, force: true });
  });

  it('should generate a proof and verify it successfully', async () => {
    const proofPath = await generateProof({
      pkgDir: TEST_PKG_DIR,
      outDir: TEST_OUT_DIR,
      commands: ['echo build'],
      pkgName: 'test-pkg'
    });

    expect(existsSync(proofPath)).toBe(true);

    const result = await verifyProof(proofPath, TEST_OUT_DIR);
    expect(result.success).toBe(true);
    expect(result.rootMatches).toBe(true);
    expect(result.artifactsMatch).toBe(true);
  });

  it('should fail verification if artifact is modified', async () => {
    const proofPath = await generateProof({
      pkgDir: TEST_PKG_DIR,
      outDir: TEST_OUT_DIR,
      commands: ['echo build'],
      pkgName: 'test-pkg'
    });

    // Modify artifact
    writeFileSync(join(TEST_OUT_DIR, 'index.js'), 'console.log("hacked");');

    const result = await verifyProof(proofPath, TEST_OUT_DIR);
    expect(result.success).toBe(false);
    expect(result.artifactsMatch).toBe(false);
  });
});
