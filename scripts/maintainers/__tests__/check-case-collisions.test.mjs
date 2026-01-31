import { test, describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const SCRIPT_PATH = join(process.cwd(), 'scripts', 'maintainers', 'check-case-collisions.mjs');

describe('Case-Sensitivity Collision Detector', () => {
    let tempDir;

    before(() => {
        tempDir = mkdtempSync(join(process.cwd(), 'case-test-'));
        execSync('git init', { cwd: tempDir });
        execSync('git config user.email "test@example.com"', { cwd: tempDir });
        execSync('git config user.name "Test User"', { cwd: tempDir });
    });

    after(() => {
        if (tempDir) {
            rmSync(tempDir, { recursive: true, force: true });
        }
    });

    it('returns 0 for a clean repo', () => {
        writeFileSync(join(tempDir, 'file.txt'), 'hello');
        execSync('git add file.txt', { cwd: tempDir });
        execSync('git commit -m "initial"', { cwd: tempDir });

        const output = execSync(`node ${SCRIPT_PATH}`, { cwd: tempDir, encoding: 'utf8' });
        assert(output.includes('✅ No case-sensitivity collisions detected.'));
    });

    it('returns 1 for a file collision', () => {
        // Use git hash-object + git update-index to create a collision in the index
        // regardless of the underlying filesystem case-sensitivity.
        const blob1 = execSync('echo "content1" | git hash-object -w --stdin', { cwd: tempDir, encoding: 'utf8' }).trim();
        const blob2 = execSync('echo "content2" | git hash-object -w --stdin', { cwd: tempDir, encoding: 'utf8' }).trim();

        execSync(`git update-index --add --cacheinfo 100644 ${blob1} Collision.txt`, { cwd: tempDir });
        execSync(`git update-index --add --cacheinfo 100644 ${blob2} collision.txt`, { cwd: tempDir });

        try {
            execSync(`node ${SCRIPT_PATH}`, { cwd: tempDir, stdio: 'pipe' });
            assert.fail('Should have exited with code 1');
        } catch (e) {
            assert.equal(e.status, 1);
            const stderr = e.stderr.toString();
            assert(stderr.includes('❌ Found 1 case-sensitivity collision groups:'));
            assert(stderr.includes('Group [collision.txt]:'));
            assert(stderr.includes('- Collision.txt'));
            assert(stderr.includes('- collision.txt'));
        }
    });

    it('returns 1 for a directory collision', () => {
        const blob = execSync('echo "content" | git hash-object -w --stdin', { cwd: tempDir, encoding: 'utf8' }).trim();

        execSync(`git update-index --add --cacheinfo 100644 ${blob} Dir/file1.txt`, { cwd: tempDir });
        execSync(`git update-index --add --cacheinfo 100644 ${blob} dir/file2.txt`, { cwd: tempDir });

        try {
            execSync(`node ${SCRIPT_PATH}`, { cwd: tempDir, stdio: 'pipe' });
            assert.fail('Should have exited with code 1');
        } catch (e) {
            assert.equal(e.status, 1);
            const stderr = e.stderr.toString();
            // Note: In our implementation, we find both 'dir' and 'Dir/file1.txt' / 'dir/file2.txt'
            // but the directory group is what we are specifically checking here.
            assert(stderr.includes('Group [dir]:'));
            assert(stderr.includes('- Dir'));
            assert(stderr.includes('- dir'));
        }
    });

    it('returns 0 with --warn-only even if collisions exist', () => {
        const output = execSync(`node ${SCRIPT_PATH} --warn-only`, { cwd: tempDir, encoding: 'utf8' });
        assert(output.includes('⚠️ Collisions found, but exiting with 0 due to --warn-only.'));
    });
});
