import { describe, it, expect } from 'vitest';
import { ArkSpine } from '../spine/arkSpine.js';
import { TaskGraph } from '../spine/taskGraph.js';
import { type SandboxExecutionBoundary } from '../spine/sandboxExecution.js';

describe('Agent spine sequencing', () => {
  it('orders tasks based on dependency graph', () => {
    const graph = new TaskGraph();
    graph.addTask({
      id: 'task-a',
      name: 'Task A',
      code: 'return "A";',
      sandboxId: 'sandbox-1',
    });
    graph.addTask({
      id: 'task-b',
      name: 'Task B',
      code: 'return "B";',
      sandboxId: 'sandbox-1',
    });
    graph.addTask({
      id: 'task-c',
      name: 'Task C',
      code: 'return "C";',
      sandboxId: 'sandbox-1',
    });
    graph.addDependency('task-a', 'task-b');
    graph.addDependency('task-b', 'task-c');

    const order = graph.getExecutionOrder().map(task => task.id);

    expect(order).toEqual(['task-a', 'task-b', 'task-c']);
    expect(graph.toArtifact().hash).toHaveLength(64);
  });

  it('runs task graph through sandbox boundary', async () => {
    const graph = new TaskGraph();
    graph.addTask({
      id: 'task-1',
      name: 'Task 1',
      code: 'return inputs.value;',
      sandboxId: 'sandbox-1',
      inputs: { value: 42 },
    });

    const sandboxBoundary: SandboxExecutionBoundary = {
      async execute() {
        return {
          executionId: 'exec-1',
          status: 'success',
          output: 42,
          logs: [],
        };
      },
    };

    const spine = new ArkSpine(graph, sandboxBoundary);
    const result = await spine.run('run-1');

    expect(result.runId).toBe('run-1');
    expect(result.events.length).toBe(2);
    expect(result.taskResults['task-1'].status).toBe('success');
  });
});
