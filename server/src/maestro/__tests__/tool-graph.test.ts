import {
  synthesizeTaskGraph,
  type ToolDependencyGraph,
} from '../tool-graph';

describe('Tool graph synthesis', () => {
  it('produces an executable connected subgraph', () => {
    const graph: ToolDependencyGraph = {
      tools: [
        {
          id: 'tool-a',
          name: 'Tool A',
          inputSchema: {},
          outputSchema: {},
          capabilityTags: ['a'],
          dependencies: [],
        },
        {
          id: 'tool-b',
          name: 'Tool B',
          inputSchema: {},
          outputSchema: {},
          capabilityTags: ['b'],
          dependencies: ['tool-a'],
        },
        {
          id: 'tool-c',
          name: 'Tool C',
          inputSchema: {},
          outputSchema: {},
          capabilityTags: ['c'],
          dependencies: ['tool-b'],
        },
      ],
    };

    const { tasks, verification } = synthesizeTaskGraph(graph, {
      targetSize: 3,
      seed: 7,
    });

    expect(tasks.nodes.length).toBe(3);
    expect(verification.executable).toBe(true);
    expect(Object.keys(verification.missingDependencies)).toHaveLength(0);
  });
});
