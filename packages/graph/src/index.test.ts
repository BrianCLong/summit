import {
  INFLUENCE_OPS_ENTITY_TYPES,
  canonicalizeInfluenceOpsGraph,
  toCanonicalInfluenceOpsJson,
} from './index';

describe('@intelgraph/graph influence ops exports', () => {
  it('exposes influence ops entity types through package index', () => {
    expect(INFLUENCE_OPS_ENTITY_TYPES).toContain('Campaign');
    expect(INFLUENCE_OPS_ENTITY_TYPES).toContain('ActorHypothesis');
  });

  it('canonicalizes graph records deterministically', () => {
    const input = {
      nodes: [
        {
          id: 'narr-2',
          type: 'Narrative' as const,
          tenantId: 'tenant-a',
          properties: { z: 2, a: 1 },
          provenance: {
            sourceId: 'src-2',
            collectedAt: '2026-02-11T00:00:00Z',
            method: 'INFERENCE' as const,
            transformChain: ['cluster:v1'],
            confidence: 0.8,
          },
          temporal: {
            observedAtStart: '2026-02-11T00:00:00Z',
          },
        },
        {
          id: 'acct-1',
          type: 'Account' as const,
          tenantId: 'tenant-a',
          provenance: {
            sourceId: 'src-1',
            collectedAt: '2026-02-11T00:00:00Z',
            method: 'API' as const,
            transformChain: ['normalize:v1'],
            confidence: 0.9,
          },
          temporal: {
            observedAtStart: '2026-02-11T00:00:00Z',
          },
        },
      ],
      edges: [
        {
          source: 'narr-2',
          target: 'acct-1',
          type: 'TARGETS' as const,
          tenantId: 'tenant-a',
          properties: { z: 2, a: 1 },
          provenance: {
            sourceId: 'src-edge-2',
            collectedAt: '2026-02-11T00:00:00Z',
            method: 'INFERENCE' as const,
            transformChain: ['edge:v1'],
            confidence: 0.7,
          },
          temporal: {
            observedAtStart: '2026-02-11T00:00:00Z',
          },
        },
        {
          source: 'acct-1',
          target: 'narr-2',
          type: 'AMPLIFIES' as const,
          tenantId: 'tenant-a',
          provenance: {
            sourceId: 'src-edge-1',
            collectedAt: '2026-02-11T00:00:00Z',
            method: 'API' as const,
            transformChain: ['edge:v1'],
            confidence: 0.95,
          },
          temporal: {
            observedAtStart: '2026-02-11T00:00:00Z',
          },
        },
      ],
    };

    const canonical = canonicalizeInfluenceOpsGraph(input);

    expect(canonical.nodes.map((node) => node.id)).toEqual(['acct-1', 'narr-2']);
    expect(canonical.edges.map((edge) => `${edge.source}:${edge.target}:${edge.type}`)).toEqual(
      ['acct-1:narr-2:AMPLIFIES', 'narr-2:acct-1:TARGETS'],
    );
    expect(canonical.nodes[1]?.properties).toEqual({ a: 1, z: 2 });
    expect(canonical.edges[1]?.properties).toEqual({ a: 1, z: 2 });
    expect(toCanonicalInfluenceOpsJson(input)).toBe(JSON.stringify(canonical));
  });
});
