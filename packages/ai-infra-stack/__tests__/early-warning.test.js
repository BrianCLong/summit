"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = __importStar(require("node:assert"));
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const os = __importStar(require("node:os"));
const service_1 = require("../src/early-warning/service");
const config_1 = require("../src/early-warning/config");
(0, node_test_1.describe)('Early Warning Layer', () => {
    let tempDir;
    let outDir;
    (0, node_test_1.beforeEach)(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'early-warning-test-'));
        outDir = path.join(tempDir, 'reports', 'ai-infra-stack');
    });
    (0, node_test_1.afterEach)(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });
    (0, node_test_1.test)('SeverityClassifier correctly assigns priorities', () => {
        const classifier = new service_1.SeverityClassifier(config_1.defaultAlertSpec);
        const signalNodeFailure = {
            id: 'sig-1', type: 'node_failure', provider: 'aws', topic: 'ec2', timestamp: Date.now()
        };
        assert.strictEqual(classifier.classify(signalNodeFailure), 'P0');
        const signalLatency = {
            id: 'sig-2', type: 'latency_spike', provider: 'gcp', topic: 'network', timestamp: Date.now()
        };
        assert.strictEqual(classifier.classify(signalLatency), 'P2');
    });
    (0, node_test_1.test)('SuppressionEngine enforces rate limits', () => {
        // limit is 5 per minute (60000ms) for latency_spike
        const engine = new service_1.SuppressionEngine(config_1.defaultRateLimits);
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
    (0, node_test_1.test)('GovernanceRouter outputs deterministic artifacts', () => {
        const layer = new service_1.EarlyWarningLayer(config_1.defaultAlertSpec, config_1.defaultRateLimits, tempDir);
        const signal = {
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
