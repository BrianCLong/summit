import { ContextAssembler, GraphContext } from '../context_assembly.js';

describe('ContextAssembler', () => {
  const mockContext: GraphContext = {
    nodes: [
      {
        id: 'actor-1',
        labels: ['Actor'],
        properties: { name: 'Alpha', evidence_id: 'EVID-001' }
      },
      {
        id: 'campaign-1',
        labels: ['Campaign'],
        properties: { title: 'Gamma', evidence_id: 'EVID-002' }
      }
    ],
    relationships: [
      {
        type: 'LEADS',
        startNodeId: 'actor-1',
        endNodeId: 'campaign-1',
        properties: {}
      }
    ]
  };

  test('serialize() should produce deterministic markdown', () => {
    const output = ContextAssembler.serialize(mockContext);

    expect(output).toContain('### Knowledge Graph Context');
    expect(output).toContain('- **[actor-1]** (Actor)');
    expect(output).toContain('Evidence ID: `EVID-001`');
    expect(output).toContain('- **[campaign-1]** (Campaign)');
    expect(output).toContain('Evidence ID: `EVID-002`');
    expect(output).toContain('- **[actor-1]** --[:LEADS]--> **[campaign-1]**');
  });

  test('serialize() should sort nodes for determinism', () => {
    const shuffledContext: GraphContext = {
      nodes: [mockContext.nodes[1], mockContext.nodes[0]],
      relationships: mockContext.relationships
    };

    const output1 = ContextAssembler.serialize(mockContext);
    const output2 = ContextAssembler.serialize(shuffledContext);

    expect(output1).toBe(output2);
  });

  test('serialize() should omit evidence_id from attributes', () => {
    const output = ContextAssembler.serialize(mockContext);
    expect(output).not.toContain('attributes: evidence_id');
  });

  test('fromRawResult() should deduplicate relationships from paths', () => {
    const mockRecord = {
      has: (key: string) => key === 'paths',
      get: (key: string) => {
        if (key === 'paths') {
          const seg = {
            start: { properties: { id: 'a' }, labels: ['Node'] },
            end: { properties: { id: 'b' }, labels: ['Node'] },
            relationship: { type: 'LINK' }
          };
          // Return two paths that share the same segment
          return [
            { segments: [seg] },
            { segments: [seg] }
          ];
        }
        return null;
      }
    };

    const context = ContextAssembler.fromRawResult([mockRecord]);
    expect(context.relationships.length).toBe(1);
  });
});
