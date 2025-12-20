import { GraphRAGCopilot, GraphNode } from './index';

describe('GraphRAGCopilot', () => {
  let copilot: GraphRAGCopilot;
  let graphData: GraphNode[];

  beforeEach(() => {
    copilot = new GraphRAGCopilot();
    graphData = [
      { id: '1', type: 'Person', properties: { name: 'Alice' } },
      { id: '2', type: 'Company', properties: { name: 'Acme Corp' } },
    ];
  });

  it('should throw an error if no citations are found', async () => {
    const question = 'Who is Bob?';
    await expect(copilot.query(question, graphData)).rejects.toThrow(
      'No resolvable citations found. Cannot answer query.'
    );
  });
});
