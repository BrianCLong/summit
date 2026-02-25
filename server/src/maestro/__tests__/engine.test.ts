import { describe, it, expect } from '@jest/globals';
import { MaestroDSL } from '../dsl.js';

describe('MaestroDSL', () => {
  it('should validate a simple DAG', () => {
    const spec = {
      nodes: [
        { id: '1', kind: 'task' as const, ref: 'a' },
        { id: '2', kind: 'task' as const, ref: 'b' }
      ],
      edges: [
        { from: '1', to: '2' }
      ]
    };
    expect(MaestroDSL.validate(spec).valid).toBe(true);
  });

  it('should detect cycles', () => {
    const spec = {
      nodes: [
        { id: '1', kind: 'task' as const, ref: 'a' },
        { id: '2', kind: 'task' as const, ref: 'b' }
      ],
      edges: [
        { from: '1', to: '2' },
        { from: '2', to: '1' }
      ]
    };
    expect(MaestroDSL.validate(spec).valid).toBe(false);
  });
});
