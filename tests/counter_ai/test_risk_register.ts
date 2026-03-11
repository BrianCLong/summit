import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { COUNTER_AI_RISKS, getRiskById } from '../../src/counter_ai/risk_register';

describe('Counter-AI Risk Register', () => {
  it('should have unique risk IDs', () => {
    const ids = new Set<string>();
    for (const risk of COUNTER_AI_RISKS) {
      assert.ok(!ids.has(risk.risk_id), `Duplicate risk ID found: ${risk.risk_id}`);
      ids.add(risk.risk_id);
    }
  });

  it('should have all mandatory fields present for each risk', () => {
    for (const risk of COUNTER_AI_RISKS) {
      assert.ok(risk.risk_id && risk.risk_id.length > 0, 'Missing risk_id');
      assert.ok(risk.name && risk.name.length > 0, 'Missing name');
      assert.ok(risk.attack_surface && risk.attack_surface.length > 0, 'Missing attack_surface');
      assert.ok(risk.attack_mode && risk.attack_mode.length > 0, 'Missing attack_mode');
      assert.ok(risk.symptom_patterns && risk.symptom_patterns.length > 0, 'Missing symptom_patterns');
      assert.ok(Array.isArray(risk.mitigation_hooks), 'mitigation_hooks must be an array');
    }
  });

  it('should allow lookup by ID', () => {
    const risk = getRiskById('CAI-001');
    assert.ok(risk, 'Risk CAI-001 should be found');
    assert.strictEqual(risk.name, 'GRAPH_RELATION_INJECTION');
  });

  it('should return undefined for unknown IDs', () => {
    const risk = getRiskById('UNKNOWN-ID');
    assert.strictEqual(risk, undefined);
  });
});
