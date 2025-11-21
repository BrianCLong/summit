import { describe, it, expect } from 'vitest';
import { DAG } from '../src/core/DAG.js';

describe('DAG', () => {
  it('should create a DAG with basic configuration', () => {
    const dag = new DAG({
      dagId: 'test-dag',
      description: 'Test DAG',
      defaultArgs: {},
    });

    expect(dag.config.dagId).toBe('test-dag');
    expect(dag.config.description).toBe('Test DAG');
  });

  it('should add tasks to the DAG', () => {
    const dag = new DAG({
      dagId: 'test-dag',
      defaultArgs: {},
    });

    dag.addTask({
      taskId: 'task1',
      execute: async () => ({ result: 'done' }),
    });

    dag.addTask({
      taskId: 'task2',
      execute: async () => ({ result: 'done' }),
    });

    const tasks = dag.getTasks();
    expect(tasks.length).toBe(2);
    expect(tasks.map(t => t.taskId)).toContain('task1');
    expect(tasks.map(t => t.taskId)).toContain('task2');
  });

  it('should set dependencies between tasks', () => {
    const dag = new DAG({
      dagId: 'test-dag',
      defaultArgs: {},
    });

    dag.addTask({
      taskId: 'task1',
      execute: async () => ({ result: 'done' }),
    });

    dag.addTask({
      taskId: 'task2',
      execute: async () => ({ result: 'done' }),
    });

    dag.setDependency('task1', 'task2');

    const deps = dag.getDependencies('task2');
    expect(deps).toContain('task1');
  });

  it('should get execution order via topological sort', () => {
    const dag = new DAG({
      dagId: 'test-dag',
      defaultArgs: {},
    });

    dag.addTask({ taskId: 'a', execute: async () => ({}) });
    dag.addTask({ taskId: 'b', execute: async () => ({}) });
    dag.addTask({ taskId: 'c', execute: async () => ({}) });

    dag.setDependency('a', 'b'); // a -> b
    dag.setDependency('b', 'c'); // b -> c

    const order = dag.getExecutionOrder();
    expect(order.indexOf('a')).toBeLessThan(order.indexOf('b'));
    expect(order.indexOf('b')).toBeLessThan(order.indexOf('c'));
  });

  it('should detect cycles', () => {
    const dag = new DAG({
      dagId: 'test-dag',
      defaultArgs: {},
    });

    dag.addTask({ taskId: 'a', execute: async () => ({}) });
    dag.addTask({ taskId: 'b', execute: async () => ({}) });

    dag.setDependency('a', 'b');
    dag.setDependency('b', 'a');

    expect(dag.hasCycles()).toBe(true);
  });
});
