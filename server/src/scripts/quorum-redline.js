"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const WriteQuorumRouter_js_1 = require("../db/WriteQuorumRouter.js");
const neo4j_js_1 = require("../db/neo4j.js");
const pino_1 = __importDefault(require("pino"));
const log = pino_1.default({ name: 'QuorumRedline' });
async function runRedline() {
    log.info('Starting Quorum Redline Test...');
    // Initialize DB
    await (0, neo4j_js_1.initializeNeo4jDriver)();
    // Configure Router for Test
    WriteQuorumRouter_js_1.writeQuorumRouter.updateConfig({
        enabledTenants: ['TENANT_REDLINE'],
        maxWriteP95Ms: 700,
        maxQuorumRTTMs: 200,
    });
    const iterations = 100;
    const tenant = 'TENANT_REDLINE';
    const errors = [];
    const latencies = [];
    log.info(`Running ${iterations} iterations for tenant ${tenant}...`);
    for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        try {
            // Simulate Chaos (random latency injection)
            const chaosDelay = Math.random() < 0.1 ? 1000 : 0; // 10% chance of 1s lag
            if (chaosDelay > 0) {
                await new Promise(r => setTimeout(r, chaosDelay));
            }
            await WriteQuorumRouter_js_1.writeQuorumRouter.write('MERGE (n:RedlineTest {id: $id}) RETURN n', { id: `test-${i}` }, tenant);
        }
        catch (e) {
            errors.push(e);
        }
        latencies.push(Date.now() - start);
    }
    // Calculate Metrics
    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];
    const errorRate = errors.length / iterations;
    log.info('Redline Results:', {
        p50,
        p95,
        p99,
        errorRate,
        total: iterations
    });
    if (p95 > 700) {
        log.error('FAIL: p95 latency exceeded 700ms');
        process.exit(1);
    }
    if (p99 > 1500) {
        log.error('FAIL: p99 latency exceeded 1500ms');
        process.exit(1);
    }
    if (errorRate > 0.005) {
        log.error('FAIL: Error rate exceeded 0.5%');
        process.exit(1);
    }
    log.info('PASS: All SLOs met.');
    await (0, neo4j_js_1.closeNeo4jDriver)();
}
runRedline().catch((err) => {
    log.error(err);
    process.exit(1);
});
