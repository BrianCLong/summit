import { test, describe, beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

import {
    EarlyWarningLayer,
    Signal,
    SeverityClassifier,
    SuppressionEngine
} from '../src/early-warning/service';

import { defaultAlertSpec, defaultRateLimits } from '../src/early-warning/config';

describe('Early Warning Layer', () => {
    let tempDir: string;
    let outDir: string;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'early-warning-test-'));
        outDir = path.join(tempDir, 'reports', 'ai-infra-stack');
    });

    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    test('SeverityClassifier correctly assigns priorities', () => {
        const classifier = new SeverityClassifier(defaultAlertSpec);

        const signalNodeFailure: Signal = {
            id: 'sig-1', type: 'node_failure', provider: 'aws', topic: 'ec2', timestamp: Date.now()
        };
        assert.strictEqual(classifier.classify(signalNodeFailure), 'P0');

        const signalLatency: Signal = {
            id: 'sig-2', type: 'latency_spike', provider: 'gcp', topic: 'network', timestamp: Date.now()
        };
        assert.strictEqual(classifier.classify(signalLatency), 'P2');
    });

    test('SuppressionEngine enforces rate limits', () => {
        // limit is 5 per minute (60000ms) for latency_spike
        const engine = new SuppressionEngine(defaultRateLimits);
        const baseTime = 1000000;

        // 1st to 5th should be allowed
        for (let i = 0; i < 5; i++) {
            const allowed = engine.shouldAllow({
                id: `sig-${i}`, type: 'latency_spike', provider: 'aws', topic: 'api', timestamp: baseTime + i * 1000
            });
            assert.strictEqual(allowed, true);
        }

        // 6th should be suppressed
        const suppressed = engine.shouldAllow({
            id: 'sig-6', type: 'latency_spike', provider: 'aws', topic: 'api', timestamp: baseTime + 6000
        });
        assert.strictEqual(suppressed, false);

        // Signal outside window should be allowed
        const allowedLater = engine.shouldAllow({
            id: 'sig-7', type: 'latency_spike', provider: 'aws', topic: 'api', timestamp: baseTime + 65000
        });
        assert.strictEqual(allowedLater, true);
    });

    test('GovernanceRouter outputs deterministic artifacts', () => {
        const layer = new EarlyWarningLayer(defaultAlertSpec, defaultRateLimits, tempDir);

        const signal: Signal = {
            id: 'sig-test',
            type: 'node_failure',
            provider: 'azure',
            topic: 'vm',
            timestamp: 1600000000000
        };

        const result = layer.processSignal(signal);

        assert.strictEqual(result.allowed, true);
        assert.ok(result.evidenceId);
        assert.strictEqual(result.evidenceId, 'EVID:AIINFRA:early-warning:azure:vm:001');

        // Check artifacts
        const sanitizedId = result.evidenceId.replace(/:/g, '-');
        const outPath = path.join(outDir, sanitizedId);
        const reportPath = path.join(outPath, 'report.json');
        const metricsPath = path.join(outPath, 'metrics.json');
        const stampPath = path.join(outPath, 'stamp.json');

        assert.strictEqual(fs.existsSync(reportPath), true);
        assert.strictEqual(fs.existsSync(metricsPath), true);
        assert.strictEqual(fs.existsSync(stampPath), true);

        const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        assert.strictEqual(report.evidenceId, result.evidenceId);
        assert.strictEqual(report.priority, 'P0');
        assert.strictEqual(report.provider, 'azure');

        const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
        assert.strictEqual(metrics.evidenceId, result.evidenceId);
        assert.strictEqual(metrics.priorityScore, 100);

        const stamp = JSON.parse(fs.readFileSync(stampPath, 'utf8'));
        assert.strictEqual(stamp.evidenceId, result.evidenceId);
        assert.strictEqual(stamp.timestamp, 1600000000000);
        assert.ok(stamp.processedAt);
    });
});
