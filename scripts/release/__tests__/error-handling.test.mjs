import { test, describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const SCRIPT_PATH_VERIFY = join(process.cwd(), 'scripts', 'release', 'verify-release-bundle.mjs');
const SCRIPT_PATH_VALIDATE = join(process.cwd(), 'scripts', 'release', 'validate-bundle-schemas.mjs');

function getSha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

function runVerifyScript(dir, expectFail = false) {
    try {
        const command = `node ${SCRIPT_PATH_VERIFY} --path=${dir}`;
        const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
        return { output, error: null };
    } catch (e) {
        if (!expectFail) throw e;
        return { output: e.stderr, error: e };
    }
}

describe('Release Bundle Error Handling', () => {
    let tempDir;

    before(() => {
        tempDir = mkdtempSync('release-bundle-test-');
    });

    after(() => {
        if (tempDir) {
            rmSync(tempDir, { recursive: true, force: true });
        }
    });

    // Helper to create a self-consistent bundle for testing specific index properties
    function setupIndexTest(indexObject) {
        // The index must contain its own hash, so we have to serialize, hash, then re-serialize.
        let tempContent = JSON.stringify(indexObject);
        let tempHash = getSha256(tempContent);

        if (!indexObject.files) {
            indexObject.files = [];
        }
        indexObject.files.push({ path: 'bundle-index.json', sha256: tempHash });

        const finalContent = JSON.stringify(indexObject);
        const finalHash = getSha256(finalContent);

        // Now, update the hash inside the object and re-serialize
        indexObject.files = indexObject.files.filter(f => f.path !== 'bundle-index.json');
        indexObject.files.push({ path: 'bundle-index.json', sha256: finalHash });

        const finalFinalContent = JSON.stringify(indexObject);
        const finalFinalHash = getSha256(finalFinalContent);

        writeFileSync(join(tempDir, 'bundle-index.json'), finalFinalContent);
        writeFileSync(join(tempDir, 'SHA256SUMS'), `${finalFinalHash}  bundle-index.json\n`);
    }

    it('throws INVALID_JSON for malformed bundle-index.json', () => {
        const content = '{ "bad json" }';
        const hash = getSha256(content);
        writeFileSync(join(tempDir, 'bundle-index.json'), content);
        writeFileSync(join(tempDir, 'SHA256SUMS'), `${hash}  bundle-index.json\n`);

        const { output, error } = runVerifyScript(tempDir, true);
        assert(error, 'Script should have failed');
        assert(output.includes('[INVALID_JSON]'), `Expected INVALID_JSON, got: ${output}`);
    });

    it('throws SCHEMA_MAJOR_UNSUPPORTED for unsupported major version', () => {
        setupIndexTest({ schemaVersion: '2.0.0' });
        const { output, error } = runVerifyScript(tempDir, true);
        assert(error, 'Script should have failed');
        assert(output.includes('[SCHEMA_MAJOR_UNSUPPORTED]'), `Expected SCHEMA_MAJOR_UNSUPPORTED, got: ${output}`);
    });

    it('throws MISSING_FIELD for missing schemaVersion', () => {
        setupIndexTest({});
        const { output, error } = runVerifyScript(tempDir, true);
        assert(error, 'Script should have failed');
        assert(output.includes('[MISSING_FIELD]'), `Expected MISSING_FIELD, got: ${output}`);
    });
});

describe('Schema Validation Error Handling', () => {
    let tempDir;

    before(() => {
        tempDir = mkdtempSync('schema-validation-test-');
        const schemaDir = join(tempDir, 'schemas', 'release');
        mkdirSync(schemaDir, { recursive: true });

        const schemaContent = {
            type: 'object',
            properties: { status: { type: 'string', enum: ['ready', 'blocked'] } },
            required: ['status']
        };
        writeFileSync(join(schemaDir, 'release-status.schema.json'), JSON.stringify(schemaContent));
    });

    after(() => {
        if (tempDir) {
            rmSync(tempDir, { recursive: true, force: true });
        }
    });

    it('throws SCHEMA_INVALID for invalid release-status.json', () => {
        const invalidStatus = { status: 'invalid-status' };
        const artifactDir = 'artifacts';
        mkdirSync(join(tempDir, artifactDir));
        writeFileSync(join(tempDir, artifactDir, 'release-status.json'), JSON.stringify(invalidStatus));

        try {
             execSync(`node ${SCRIPT_PATH_VALIDATE} --dir=${artifactDir} --strict`, { cwd: tempDir, encoding: 'utf8', stdio: 'pipe' });
             assert.fail('Script should have thrown');
        } catch (e) {
            assert(e.stderr.includes('[SCHEMA_INVALID]'), `Expected SCHEMA_INVALID, got: ${e.stderr}`);
        }
    });
});
