
import test from 'node:test';
import assert from 'node:assert';
import { SensitivityClass } from '../../server/src/pii/sensitivity.ts';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../');

test('GA Critical: Taxonomy Invariants', async (t) => {
    await t.test('Sensitivity Levels are defined', () => {
        assert.ok(SensitivityClass, 'SensitivityClass should be defined');
        assert.ok(Object.keys(SensitivityClass).length > 0, 'Should have levels');
    });

    await t.test('Critical levels exist', () => {
         // Check for standard levels
         assert.ok(Object.values(SensitivityClass).includes(SensitivityClass.HIGHLY_SENSITIVE));
         assert.ok(Object.values(SensitivityClass).includes(SensitivityClass.TOP_SECRET));
    });
});

test('GA Critical: Config Validation', async (t) => {
    await t.test('Rate Limit Middleware exists and has logic', () => {
        const rateLimitPath = path.join(REPO_ROOT, 'server/src/middleware/rateLimit.ts');
        const content = fs.readFileSync(rateLimitPath, 'utf-8');
        // Ensure it imports rate limiting library or implements it
        assert.ok(content.includes('rateLimit') || content.includes('RateLimit'), 'Should contain rate limit logic');
    });
});

test('GA Critical: Auth Invariants', async (t) => {
    await t.test('Auth middleware exports ensureAuthenticated', async () => {
        const authModule = await import('../../server/src/middleware/auth.ts');
        assert.ok(typeof authModule.ensureAuthenticated === 'function', 'ensureAuthenticated should be a function');
    });
});
