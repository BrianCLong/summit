import { describe, it, expect } from 'vitest';
import { CISPluginRegistry } from '../../src/connectors/cis/plugins/registry';
import { IntegrityOracle, NarrativeIntel } from '../../src/connectors/cis/plugins/types';

describe('CIS Plugin Contracts', () => {
  it('should register and retrieve IntegrityOracle plugins', () => {
    const registry = new CISPluginRegistry();
    const oracle: IntegrityOracle = {
      id: 'mock-oracle',
      name: 'Mock Oracle',
      type: 'IntegrityOracle',
      initialize: async () => {},
      healthCheck: async () => true,
      analyze: async () => ({
        artifact_id: '1',
        artifact_hash: 'abc',
        modality: 'text',
        scores: { ai_generated: 0.9, manipulated: 0, spoof: 0 },
        confidence: 0.95,
        provider: 'mock',
        model_id: 'v1',
        evidence_ids: []
      })
    };

    registry.register(oracle);
    const retrieved = registry.getIntegrityOracles();
    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].id).toBe('mock-oracle');
  });

  it('should register and retrieve NarrativeIntel plugins', () => {
    const registry = new CISPluginRegistry();
    const intel: NarrativeIntel = {
      id: 'mock-intel',
      name: 'Mock Intel',
      type: 'NarrativeIntel',
      initialize: async () => {},
      healthCheck: async () => true,
      fetchFeed: async () => []
    };

    registry.register(intel);
    const retrieved = registry.getNarrativeIntelPlugins();
    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].id).toBe('mock-intel');
  });
});
