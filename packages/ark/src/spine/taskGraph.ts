import { createHash } from 'crypto';

export type TaskLanguage = 'javascript' | 'typescript' | 'python';

export interface TaskGraphTask {
  id: string;
  name: string;
  code: string;
  sandboxId: string;
  language?: TaskLanguage;
  entryPoint?: string;
  inputs?: Record<string, unknown>;
  metadata?: Record<string, string>;
}

export interface TaskGraphDependency {
  from: string;
  to: string;
}

export interface TaskGraphArtifact {
  schemaVersion: 'v1';
  createdAt: string;
  nodes: TaskGraphTask[];
  edges: TaskGraphDependency[];
  hash: string;
}

export class TaskGraph {
  private tasks = new Map<string, TaskGraphTask>();
  private dependencies: TaskGraphDependency[] = [];

  addTask(task: TaskGraphTask): void {
    if (this.tasks.has(task.id)) {
      throw new Error(`Task ${task.id} already exists`);
    }
    this.tasks.set(task.id, task);
  }

  addDependency(from: string, to: string): void {
    if (!this.tasks.has(from) || !this.tasks.has(to)) {
      throw new Error('Dependencies must reference existing tasks');
    }
    this.dependencies.push({ from, to });
  }

  getExecutionOrder(): TaskGraphTask[] {
    const incoming = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    for (const id of this.tasks.keys()) {
      incoming.set(id, 0);
      adjacency.set(id, []);
    }

    for (const edge of this.dependencies) {
      adjacency.get(edge.from)?.push(edge.to);
      incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1);
    }

    const queue: string[] = [];
    for (const [id, count] of incoming.entries()) {
      if (count === 0) {
        queue.push(id);
      }
    }

    const ordered: TaskGraphTask[] = [];

    while (queue.length > 0) {
      const id = queue.shift();
      if (!id) {
        break;
      }
      const task = this.tasks.get(id);
      if (task) {
        ordered.push(task);
      }

      for (const neighbor of adjacency.get(id) ?? []) {
        const nextCount = (incoming.get(neighbor) ?? 0) - 1;
        incoming.set(neighbor, nextCount);
        if (nextCount === 0) {
          queue.push(neighbor);
        }
      }
    }

    if (ordered.length !== this.tasks.size) {
      throw new Error('Task graph contains a cycle');
    }

    return ordered;
  }

  toArtifact(): TaskGraphArtifact {
    const nodes = Array.from(this.tasks.values()).sort((a, b) => a.id.localeCompare(b.id));
    const edges = [...this.dependencies].sort((a, b) => {
      if (a.from === b.from) {
        return a.to.localeCompare(b.to);
      }
      return a.from.localeCompare(b.from);
    });
    const payload = JSON.stringify({ nodes, edges });
    const hash = createHash('sha256').update(payload).digest('hex');

    return {
      schemaVersion: 'v1',
      createdAt: new Date().toISOString(),
      nodes,
      edges,
      hash,
    };
  }
}
