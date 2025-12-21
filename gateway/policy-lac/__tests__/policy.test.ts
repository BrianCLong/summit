import { PolicyEngine } from '../src/index';
import path from 'path';

describe('PolicyEngine', () => {
  const engine = new PolicyEngine(path.join(__dirname, '..', 'policies', 'default.json'));

  it('denies unknown operations with default reason', () => {
    const result = engine.evaluate('unknown');
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/Denied by default/);
  });

  it('blocks unsafe operations before policy lookup', () => {
    const result = engine.evaluate('db.drop');
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/Unsafe operation/);
  });

  it('produces a stable diff snapshot', () => {
    const diff = engine.diff([
      { operation: 'policy.explain', effect: 'allow', reason: 'standard explain endpoint' },
      { operation: 'graph.read', effect: 'allow', reason: 'safe read' }
    ]);
    expect(diff.added.map(r => r.operation)).toEqual(['graph.read']);
    expect(diff.removed.map(r => r.operation)).toEqual(['graph.schema', 'graph.write']);
  });

  it('simulates multiple operations with deterministic ordering', () => {
    const simulation = engine.simulate(['graph.write', 'policy.explain', 'db.drop']);
    expect(simulation.map(r => r.operation)).toEqual(['db.drop', 'graph.write', 'policy.explain']);
    expect(simulation.find(r => r.operation === 'policy.explain')?.allowed).toBe(true);
    expect(simulation.find(r => r.operation === 'db.drop')?.allowed).toBe(false);
  });
});
