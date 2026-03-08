"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const perf_hooks_1 = require("perf_hooks");
const PolicySimulator_ts_1 = require("../server/src/analytics/policy/PolicySimulator.ts");
const ReceiptService_ts_1 = require("../server/src/services/ReceiptService.ts");
async function benchmark() {
    console.log('--- Sprint 08 Performance Benchmark ---');
    // 1. Policy Simulation p95
    const simulator = (0, PolicySimulator_ts_1.getPolicySimulator)();
    const simTimes = [];
    for (let i = 0; i < 50; i++) {
        const start = perf_hooks_1.performance.now();
        await simulator.simulate({
            tenantId: 'bench-tenant',
            changes: [{ id: '1', type: 'add', description: 'test', after: { id: 'r1', action: 'allow', priority: 1, resource: '*', subjects: ['*'], condition: '', name: 'test' } }]
        });
        simTimes.push(perf_hooks_1.performance.now() - start);
    }
    const p95Sim = simTimes.sort((a, b) => a - b)[Math.floor(simTimes.length * 0.95)];
    console.log(`p95 Policy Simulation: ${p95Sim.toFixed(2)}ms (Target: <150ms)`);
    // 2. Receipt Write async enqueue
    const writeTimes = [];
    for (let i = 0; i < 50; i++) {
        const start = perf_hooks_1.performance.now();
        // generateReceipt is now async but the evidence write is enqueued
        await ReceiptService_ts_1.receiptService.generateReceipt({
            action: 'bench.action',
            actor: { id: 'u1', tenantId: 't1' },
            resource: 'r1',
            input: { data: 'test' }
        });
        writeTimes.push(perf_hooks_1.performance.now() - start);
    }
    const p95Write = writeTimes.sort((a, b) => a - b)[Math.floor(writeTimes.length * 0.95)];
    console.log(`p95 Receipt Write (enqueue): ${p95Write.toFixed(2)}ms (Target: <200ms)`);
    console.log('--- Benchmark Complete ---');
}
benchmark().catch(console.error);
