/// <reference types="vitest" />
import { describe, expect, it } from 'vitest';
import { compileToIR, yamlToIR } from '../index';

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

describe('intent engine compiler', () => {
  it('creates deterministic hashes and ordering', () => {
    const ir = yamlToIR(sampleYaml);
    expect(ir.name).toBe('example');
    expect(ir.nodes.map((n) => n.id)).toEqual(['a', 'b']);
    expect(ir.edges).toEqual([{ from: 'a', to: 'b' }]);
    expect(ir.specHash).toHaveLength(64);
  });

  it('respects explicit retry configuration', () => {
    const ir = compileToIR({
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

    expect(ir.retry.strategy).toBe('fixed');
    expect(ir.retry.maxAttempts).toBe(7);
    expect(ir.retry.baseMs).toBe(1000);
  });
});
