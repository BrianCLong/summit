import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../..');
const EVIDENCE_DIR = path.join(ROOT_DIR, 'evidence/deps');

test('Security Evidence Pack', async (t) => {
    await t.test('generates a deterministic report structure', () => {
        // Run the report generator in fast mode for test speed
        execSync('npx tsx scripts/security/deps-report.ts --fast', { cwd: ROOT_DIR, stdio: 'ignore' });

        // Find the latest report
        const packs = fs.readdirSync(EVIDENCE_DIR)
            .filter(f => fs.statSync(path.join(EVIDENCE_DIR, f)).isDirectory())
            .sort()
            .reverse();

        assert.ok(packs.length > 0, 'Should have at least one report pack');
        const latestReport = path.join(EVIDENCE_DIR, packs[0]);

        // Assert structure
        assert.ok(fs.existsSync(path.join(latestReport, 'environment.json')), 'environment.json missing');
        assert.ok(fs.existsSync(path.join(latestReport, 'state.json')), 'state.json missing');
        assert.ok(fs.existsSync(path.join(latestReport, 'INDEX.md')), 'INDEX.md missing');

        // Assert Content
        const index = fs.readFileSync(path.join(latestReport, 'INDEX.md'), 'utf8');
        assert.ok(index.includes('# Dependency Security Report'), 'INDEX.md missing title');
        assert.ok(index.includes('## Environment'), 'INDEX.md missing environment section');
    });

    await t.test('passes drift check immediately after generation', () => {
        // Should pass with exit code 0
        const output = execSync('npx tsx scripts/security/deps-drift-check.ts', { cwd: ROOT_DIR, encoding: 'utf8' });
        assert.ok(output.includes('✅ No drift detected'), 'Drift check failed after generation');
    });
});

