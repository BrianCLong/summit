import { describe, it, expect } from 'vitest';
import { compileToTaskGraph } from '../../api/agent-os/desired-state/index';

describe('Task Graph Compilation', () => {
  it('compiles an objective into a task graph', () => {
    const graph = compileToTaskGraph({ issueId: '123', description: 'Fix bug' });
    expect(graph.id).toBe('graph-123');
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0].kind).toBe('plan');
  });
});
