import { describe, it, expect } from 'vitest';
import { TaskGraph } from '../src/scheduler/graph.js';
import { Task } from '../src/types.js';

describe('TaskGraph Determinism', () => {
  it('should auto-unblock tasks deterministically', () => {
    const graph = new TaskGraph();

    const taskA: Task = {
        id: 'A', subject: 'Root', status: 'pending', blockedBy: [], blocks: ['B'], timestamps: { created: '0' }
    };
    const taskB: Task = {
        id: 'B', subject: 'Child', status: 'pending', blockedBy: ['A'], blocks: ['C'], timestamps: { created: '0' }
    };
    const taskC: Task = {
        id: 'C', subject: 'Grandchild', status: 'pending', blockedBy: ['B'], blocks: [], timestamps: { created: '0' }
    };

    graph.addTask(taskA);
    graph.addTask(taskB);
    graph.addTask(taskC);

    // Initial state: Only A is ready
    let ready = graph.getReadyTasks();
    expect(ready.map(t => t.id)).toEqual(['A']);

    // Complete A
    graph.completeTask('A', '1');

    // Now B should be ready
    ready = graph.getReadyTasks();
    expect(ready.map(t => t.id)).toEqual(['B']);

    // Complete B
    graph.completeTask('B', '2');

    // Now C should be ready
    ready = graph.getReadyTasks();
    expect(ready.map(t => t.id)).toEqual(['C']);
  });

  it('should sort ready tasks by ID', () => {
      const graph = new TaskGraph();
      graph.addTask({ id: 'Z', status: 'pending', blockedBy: [], blocks: [], timestamps: { created: '0' }, subject: '' });
      graph.addTask({ id: 'A', status: 'pending', blockedBy: [], blocks: [], timestamps: { created: '0' }, subject: '' });

      const ready = graph.getReadyTasks();
      expect(ready.map(t => t.id)).toEqual(['A', 'Z']);
  });
});
