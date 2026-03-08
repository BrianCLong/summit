import { jest } from '@jest/globals';
import { Kg2RagPipeline } from '../kg2ragPipeline.js';

describe('Kg2RagPipeline', () => {
  let pipeline: any;
  let mockRetriever: any;
  let mockDriver: any;
  let mockSession: any;

  beforeEach(() => {
    mockRetriever = {
      retrieve: jest.fn<any>().mockResolvedValue([
        { id: 'chunk1', content: 'test', citations: [], graphPaths: [], relevanceScore: 1.0, tenantId: 't1' }
      ]),
    };

    mockSession = {
      run: jest.fn<any>(),
      close: jest.fn<any>(),
    };

    mockDriver = {
      session: jest.fn<any>().mockReturnValue(mockSession),
    };

    pipeline = new Kg2RagPipeline({
      documentRetriever: mockRetriever,
      driver: mockDriver,
    });
  });

  test('buildSeedSet should retrieve chunks and map to nodes', async () => {
    mockSession.run.mockResolvedValue({
      records: [
        {
          get: (key: string) => {
            if (key === 'e') return { properties: { id: 'node1', name: 'Entity1' }, labels: ['Person'] };
            return null;
          }
        }
      ]
    });

    const result = await pipeline.buildSeedSet('query', { tenantId: 't1', query: 'query' });

    expect(mockRetriever.retrieve).toHaveBeenCalled();
    expect(mockSession.run).toHaveBeenCalledWith(expect.stringContaining('MATCH (d:Document)-[:MENTIONS]->(e:Entity)'), expect.any(Object));
    expect(result.seedNodes).toHaveLength(1);
    expect(result.seedNodes[0].id).toBe('node1');
  });

  test('expandViaGraph should expand from seed nodes', async () => {
    mockSession.run.mockResolvedValue({
      records: []
    });

    const seed = {
      query: 'query',
      seedChunks: [],
      seedNodes: [{ id: 'node1', type: 'Person', label: 'Entity1', properties: { id: 'node1' }, saliency: 1.0 }]
    };

    const result = await pipeline.expandViaGraph(seed, { tenantId: 't1', query: 'query' });

    expect(mockSession.run).toHaveBeenCalledWith(expect.stringContaining('MATCH p=(s:Entity)'), expect.any(Object));
    // It should contain the seed node because we initialize nodes with seedNodes
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].id).toBe('node1');
  });

  test('organizeContext should sort nodes deterministically', () => {
     const subgraph = {
         nodes: [
             { id: 'b', type: 'Person', label: 'Bob', properties: { id: 'b' }, saliency: 0.5 },
             { id: 'a', type: 'Person', label: 'Alice', properties: { id: 'a' }, saliency: 0.8 }
         ],
         edges: [],
         truncated: false
     };

     const context = pipeline.organizeContext(subgraph, 'query', { tenantId: 't1', query: 'query' });

     expect(context.provenance.nodes[0].id).toBe('a'); // Alice has higher saliency
     expect(context.provenance.nodes[1].id).toBe('b');
  });
});
