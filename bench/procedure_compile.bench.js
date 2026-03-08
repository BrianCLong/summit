"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_perf_hooks_1 = require("node:perf_hooks");
const strict_1 = __importDefault(require("node:assert/strict"));
const compile_1 = require("../agentic/procedures/compiler/compile");
const maxMs = Number(process.env.PROCEDURE_BENCH_MAX_MS ?? 150);
const iterations = Number(process.env.PROCEDURE_BENCH_ITERATIONS ?? 200);
const procedure = {
    id: 'bench-procedure',
    version: '1.0.0',
    inputs: { caseId: 'bench' },
    steps: Array.from({ length: 50 }, (_, index) => ({
        type: 'graph.query',
        name: `Step ${index + 1}`,
        with: { fanout: 100, queryId: `q-${index + 1}` },
    })),
};
const start = node_perf_hooks_1.performance.now();
for (let i = 0; i < iterations; i += 1) {
    (0, compile_1.compileProcedure)(procedure);
}
const elapsed = node_perf_hooks_1.performance.now() - start;
console.log(`Compiled ${iterations} procedures in ${elapsed.toFixed(2)}ms (budget ${maxMs}ms)`);
strict_1.default.ok(elapsed <= maxMs, `Procedure compile benchmark exceeded budget (${elapsed.toFixed(2)}ms > ${maxMs}ms).`);
