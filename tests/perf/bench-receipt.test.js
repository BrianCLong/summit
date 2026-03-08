"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bench_receipt_js_1 = require("../../perf/bench-receipt.js");
describe('receipt benchmark report', () => {
    it('returns a structured report with environment and throughput data', async () => {
        const report = await (0, bench_receipt_js_1.runReceiptBenchmark)({ iterations: 5, smoke: true });
        expect(report.benchmark).toBe('receipt-validation');
        expect(report.iterations).toBe(5);
        expect(report.durationMs).toBeGreaterThan(0);
        expect(report.opsPerSec).toBeGreaterThan(0);
        expect(report.mode).toBe('smoke');
        expect(report.environment.node).toMatch(/^v\d+/);
        expect(report.environment.platform).toBeDefined();
        expect(report.environment.cpus).toBeGreaterThan(0);
        expect(report.sampleReceiptId.length).toBeGreaterThan(0);
    });
});
