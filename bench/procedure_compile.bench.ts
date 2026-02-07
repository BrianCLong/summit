/* eslint-disable no-console */
import { performance } from 'node:perf_hooks';
import assert from 'node:assert/strict';
import { compileProcedure } from '../agentic/procedures/compiler/compile';
import type { Procedure } from '../agentic/procedures/types';

const maxMs = Number(process.env.PROCEDURE_BENCH_MAX_MS ?? 150);
const iterations = Number(process.env.PROCEDURE_BENCH_ITERATIONS ?? 200);

const procedure: Procedure = {
  id: 'bench-procedure',
  version: '1.0.0',
  inputs: { caseId: 'bench' },
  steps: Array.from({ length: 50 }, (_, index) => ({
    type: 'graph.query',
    name: `Step ${index + 1}`,
    with: { fanout: 100, queryId: `q-${index + 1}` },
  })),
};

const start = performance.now();
for (let i = 0; i < iterations; i += 1) {
  compileProcedure(procedure);
}
const elapsed = performance.now() - start;

console.log(
  `Compiled ${iterations} procedures in ${elapsed.toFixed(2)}ms (budget ${maxMs}ms)`,
);
assert.ok(
  elapsed <= maxMs,
  `Procedure compile benchmark exceeded budget (${elapsed.toFixed(2)}ms > ${maxMs}ms).`,
);
