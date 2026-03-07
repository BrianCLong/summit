import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { writeMetrics, detectDrift, writeStamp } from '../../scripts/monitoring/epistemic-assurance-drift';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Epistemic Determinism', () => {
    test('writeMetrics produces deterministic output (no timestamp)', () => {
        const metrics = {
            timestamp: new Date().toISOString(),
            totalDecisions: 100,
            approved: 50,
            blocked: 20,
            escalated: 15,
            degraded: 15,
            averageSupportScore: 0.75,
            averageConflictScore: 0.1
        };

        const testPath = path.join(__dirname, 'test-metrics.json');
        writeMetrics(metrics, testPath);

        const writtenData = JSON.parse(fs.readFileSync(testPath, 'utf8'));
        assert.strictEqual(writtenData.timestamp, undefined);
        assert.strictEqual(writtenData.totalDecisions, 100);

        // cleanup
        fs.unlinkSync(testPath);
    });

    test('drift detector flags significant changes', () => {
        const current = {
            timestamp: new Date().toISOString(),
            totalDecisions: 100,
            approved: 20, // 20%
            blocked: 50,
            escalated: 15,
            degraded: 15,
            averageSupportScore: 0.5,
            averageConflictScore: 0.1
        };

        const historical = [
            {
                timestamp: '2023-01-01T00:00:00Z',
                totalDecisions: 100,
                approved: 80, // 80%
                blocked: 10,
                escalated: 5,
                degraded: 5,
                averageSupportScore: 0.85,
                averageConflictScore: 0.1
            }
        ];

        const alerts = detectDrift(current, historical);
        assert.ok(alerts.length > 0);
        assert.ok(alerts.some(a => a.includes('Approval rate drifted significantly')));
        assert.ok(alerts.some(a => a.includes('Support score drifted')));
    });

    test('writeStamp generates reproducible hash', () => {
        const bundle = { claimId: "123", evidence: ["ev-1", "ev-2"] };
        const testPath = path.join(__dirname, 'test-stamp.json');

        writeStamp(bundle, testPath);

        const data1 = JSON.parse(fs.readFileSync(testPath, 'utf8'));
        assert.ok(data1.hash);

        // cleanup
        fs.unlinkSync(testPath);
    });
});
