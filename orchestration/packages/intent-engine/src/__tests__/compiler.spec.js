"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/// <reference types="vitest" />
const vitest_1 = require("vitest");
const index_1 = require("../index");
const sampleYaml = `
apiVersion: chronos.v1
kind: Workflow
metadata:
  name: example
  namespace: demo
spec:
  tasks:
    - id: a
      uses: http.get
    - id: b
      uses: kafka.publish
      needs:
        - a
`;
(0, vitest_1.describe)('intent engine compiler', () => {
    (0, vitest_1.it)('creates deterministic hashes and ordering', () => {
        const ir = (0, index_1.yamlToIR)(sampleYaml);
        (0, vitest_1.expect)(ir.name).toBe('example');
        (0, vitest_1.expect)(ir.nodes.map((n) => n.id)).toEqual(['a', 'b']);
        (0, vitest_1.expect)(ir.edges).toEqual([{ from: 'a', to: 'b' }]);
        (0, vitest_1.expect)(ir.specHash).toHaveLength(64);
    });
    (0, vitest_1.it)('respects explicit retry configuration', () => {
        const ir = (0, index_1.compileToIR)({
            apiVersion: 'chronos.v1',
            kind: 'Workflow',
            metadata: { name: 'retry-demo', namespace: 'demo' },
            spec: {
                tasks: [
                    { id: 'single', uses: 'noop' },
                ],
                retries: {
                    default: { strategy: 'fixed', maxAttempts: 7, baseMs: 1000 },
                },
            },
        });
        (0, vitest_1.expect)(ir.retry.strategy).toBe('fixed');
        (0, vitest_1.expect)(ir.retry.maxAttempts).toBe(7);
        (0, vitest_1.expect)(ir.retry.baseMs).toBe(1000);
    });
    (0, vitest_1.it)('propagates top-level inputs into the IR', () => {
        const ir = (0, index_1.compileToIR)({
            apiVersion: 'chronos.v1',
            kind: 'Workflow',
            metadata: { name: 'inputs-demo', namespace: 'demo' },
            spec: {
                inputs: { foo: 'bar', tenants: ['t1', 't2'] },
                tasks: [{ id: 'single', uses: 'noop' }],
            },
        });
        (0, vitest_1.expect)(ir.inputs).toEqual({ foo: 'bar', tenants: ['t1', 't2'] });
    });
});
