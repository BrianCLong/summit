
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import assert from 'assert';
import { describe, it, beforeEach } from 'node:test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');
const ARTIFACTS_DIR = path.join(ROOT_DIR, 'scratchpad', 'test_artifacts');
const EVIDENCE_DIR = path.join(ARTIFACTS_DIR, 'evidence');

const VERIFY_SCRIPT = path.join(ROOT_DIR, 'scripts/ci/verify_evidence_consistency.mjs');

function setup() {
    if (fs.existsSync(ARTIFACTS_DIR)) {
        fs.rmSync(ARTIFACTS_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

function createManifest(files) {
    const manifest = {
        meta: { timestamp: new Date().toISOString(), gitSha: 'test', builder: 'test' },
        files: {}
    };
    for (const file of files) {
        manifest.files[file] = { sha256: 'dummy', size: 100, mimeType: 'text/plain' };
        // Create dummy file
        fs.writeFileSync(path.join(ARTIFACTS_DIR, file), 'dummy content');
    }
    fs.writeFileSync(path.join(EVIDENCE_DIR, 'evidence-manifest.json'), JSON.stringify(manifest));
}

function runVerifier(strict = false) {
    try {
        const cmd = `node ${VERIFY_SCRIPT} ${strict ? '--strict' : ''}`;
        execSync(cmd, {
            env: { ...process.env, ARTIFACTS_DIR },
            stdio: 'pipe'
        });
        return { success: true };
    } catch (error) {
        return { success: false, output: error.message };
    }
}

describe('Evidence Consistency Gate', () => {
    beforeEach(setup);

    it('should PASS for valid evidence IDs', () => {
        createManifest([
            'ops-evidence-2024-W40-123456.tar.gz',
            'release-evidence-v1.0.0-123456.tar.gz'
        ]);
        const result = runVerifier(true);
        assert.ok(result.success, 'Verifier should pass for valid files');
    });

    it('should FAIL for invalid evidence IDs in strict mode', () => {
        createManifest([
            'my-vacation.jpg'
        ]);
        const result = runVerifier(true);
        assert.strictEqual(result.success, false, 'Verifier should fail in strict mode');
    });

    it('should PASS (warn) for invalid IDs in non-strict mode', () => {
        createManifest([
            'my-vacation.jpg'
        ]);
        const result = runVerifier(false);
        assert.ok(result.success, 'Verifier should pass (warn) in non-strict mode');
    });

    it('should FAIL if manifest is missing', () => {
        // No manifest created
        const result = runVerifier(true);
        assert.strictEqual(result.success, false);
    });
});
