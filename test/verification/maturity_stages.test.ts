import { test } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'child_process';
import { join } from 'path';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';

const TEST_DIR = 'test/temp/maturity';
const SCRIPT = 'scripts/ci/evaluate_maturity_stage.ts';

function runEvaluator(args: string[]) {
    const cmd = `npx tsx ${SCRIPT} ${args.join(' ')}`;
    try {
        const stdout = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
        return { stdout, exitCode: 0 };
    } catch (e: any) {
        return { stdout: e.stdout, exitCode: e.status };
    }
}

test('Maturity Stage Evaluation', async (t) => {
    // Setup
    if (!existsSync(TEST_DIR)) {
        mkdirSync(TEST_DIR, { recursive: true });
    }

    // Create dummy evidence
    writeFileSync(join(TEST_DIR, 'pass.json'), JSON.stringify({ ok: true }));
    writeFileSync(join(TEST_DIR, 'fail.json'), JSON.stringify({ ok: false, code: 'FAIL', message: 'Failed' }));

    await t.test('detects PILOT stage for main', () => {
        const res = runEvaluator(['--tag', 'main', '--output-json', join(TEST_DIR, 'eval.json')]);
        assert.strictEqual(res.exitCode, 0);
        assert.match(res.stdout, /Stage: PILOT/);
    });

    await t.test('detects PRE_GA stage for rc tag', () => {
        const res = runEvaluator(['--tag', 'v1.0.0-rc.1', '--output-json', join(TEST_DIR, 'eval.json')]);
        // PRE_GA requires promotion_guard. If missing, it fails.
        assert.strictEqual(res.exitCode, 1);
        assert.match(res.stdout, /Stage: PRE_GA/);
        assert.match(res.stdout, /promotion_guard: MISSING_EVIDENCE/);
    });

    await t.test('detects GA stage for version tag', () => {
        const res = runEvaluator(['--tag', 'v1.0.0', '--output-json', join(TEST_DIR, 'eval.json')]);
        assert.strictEqual(res.exitCode, 1);
        assert.match(res.stdout, /Stage: GA/);
    });

    await t.test('passes PRE_GA when required evidence is present and passing', () => {
        const res = runEvaluator([
            '--tag', 'v1.0.0-rc.1',
            '--promotion-guard', join(TEST_DIR, 'pass.json'),
            '--observability-verify', join(TEST_DIR, 'pass.json'),
            '--output-json', join(TEST_DIR, 'eval.json')
        ]);
        assert.strictEqual(res.exitCode, 0);
        assert.match(res.stdout, /Maturity evaluation PASSED/);
    });

    await t.test('fails GA when required evidence is failing', () => {
        const res = runEvaluator([
            '--tag', 'v1.0.0',
            '--promotion-guard', join(TEST_DIR, 'fail.json'), // Required for GA
            '--output-json', join(TEST_DIR, 'eval.json')
        ]);
        assert.strictEqual(res.exitCode, 1);
        assert.match(res.stdout, /promotion_guard: FAIL/);
    });

    // Cleanup
    rmSync(TEST_DIR, { recursive: true, force: true });
});
