/**
 * DAG (Directed Acyclic Graph) class for workflow definition
 */

import { Graph, alg } from 'graphlib';
import { v4 as uuidv4 } from 'uuid';
import { DAGConfig, TaskConfig, DAGNode, TriggerRule } from './types.js';

export class DAG {
  public readonly dagId: string;
  public readonly config: DAGConfig;
  private graph: Graph;
  private tasks: Map<string, TaskConfig>;
  private version: number;

  constructor(config: DAGConfig) {
    this.dagId = config.dagId;
    this.config = config;
    this.graph = new Graph({ directed: true });
    this.tasks = new Map();
    this.version = 1;
  }

  /**
   * Add a task to the DAG
   */
  addTask(config: TaskConfig): void {
    if (this.tasks.has(config.taskId)) {
      throw new Error(`Task ${config.taskId} already exists in DAG ${this.dagId}`);
    }

    // Apply default args
    const taskConfig: TaskConfig = {
      ...this.config.defaultArgs,
      ...config,
      triggerRule: config.triggerRule || 'all_success',
      priority: config.priority || 1,
      retryPolicy: {
        maxRetries: 0,
        retryDelay: 60000,
        exponentialBackoff: true,
        backoffMultiplier: 2,
        maxRetryDelay: 600000,
        ...config.retryPolicy,
      },
    };

    this.tasks.set(config.taskId, taskConfig);
    this.graph.setNode(config.taskId, taskConfig);

    // Add dependencies
    if (config.dependencies) {
      config.dependencies.forEach(depId => {
        if (!this.tasks.has(depId)) {
          throw new Error(`Dependency ${depId} not found for task ${config.taskId}`);
        }
        this.graph.setEdge(depId, config.taskId);
      });
    }

    this.version++;
  }

  /**
   * Set task dependencies
   */
  setDependencies(taskId: string, dependencies: string[]): void {
    if (!this.tasks.has(taskId)) {
      throw new Error(`Task ${taskId} not found in DAG ${this.dagId}`);
    }

    // Remove existing edges
    const inEdges = this.graph.inEdges(taskId) || [];
    inEdges.forEach(edge => {
      if (edge) {
        this.graph.removeEdge(edge.v, edge.w);
      }
    });

    // Add new edges
    dependencies.forEach(depId => {
      if (!this.tasks.has(depId)) {
        throw new Error(`Dependency ${depId} not found for task ${taskId}`);
      }
      this.graph.setEdge(depId, taskId);
    });

    // Update task config
    const taskConfig = this.tasks.get(taskId)!;
    taskConfig.dependencies = dependencies;
    this.version++;
  }

  /**
   * Set downstream dependencies (syntactic sugar)
   */
  setDownstream(taskId: string, downstreamIds: string[]): void {
    downstreamIds.forEach(downstreamId => {
      const downstreamTask = this.tasks.get(downstreamId);
      if (!downstreamTask) {
        throw new Error(`Task ${downstreamId} not found in DAG ${this.dagId}`);
      }
      const deps = downstreamTask.dependencies || [];
      if (!deps.includes(taskId)) {
        this.setDependencies(downstreamId, [...deps, taskId]);
      }
    });
  }

  /**
   * Validate the DAG
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for cycles
    if (!alg.isAcyclic(this.graph)) {
      const cycles = this.findCycles();
      errors.push(`DAG ${this.dagId} contains cycles: ${JSON.stringify(cycles)}`);
    }

    // Check that all tasks exist
    this.tasks.forEach((config, taskId) => {
      if (!this.graph.hasNode(taskId)) {
        errors.push(`Task ${taskId} not in graph`);
      }

      // Check dependencies
      if (config.dependencies) {
        config.dependencies.forEach(depId => {
          if (!this.tasks.has(depId)) {
            errors.push(`Dependency ${depId} not found for task ${taskId}`);
          }
        });
      }
    });

    // Check for orphaned nodes
    const nodes = this.graph.nodes();
    nodes.forEach(nodeId => {
      if (!this.tasks.has(nodeId)) {
        errors.push(`Node ${nodeId} in graph but not in tasks`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Find cycles in the graph (for error reporting)
   */
  private findCycles(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const detectCycle = (node: string, path: string[]): boolean => {
      visited.add(node);
      recStack.add(node);
      path.push(node);

      const successors = this.graph.successors(node) || [];
      for (const successor of successors) {
        if (!visited.has(successor)) {
          if (detectCycle(successor, [...path])) {
            return true;
          }
        } else if (recStack.has(successor)) {
          const cycleStart = path.indexOf(successor);
          cycles.push([...path.slice(cycleStart), successor]);
          return true;
        }
      }

      recStack.delete(node);
      return false;
    };

    this.graph.nodes().forEach(node => {
      if (!visited.has(node)) {
        detectCycle(node, []);
      }
    });

    return cycles;
  }

  /**
   * Get topological ordering of tasks
   */
  getTopologicalOrder(): string[] {
    if (!alg.isAcyclic(this.graph)) {
      throw new Error(`Cannot get topological order: DAG ${this.dagId} contains cycles`);
    }
    return alg.topsort(this.graph);
  }

  /**
   * Get root tasks (tasks with no upstream dependencies)
   */
  getRootTasks(): string[] {
    return this.graph.nodes().filter(nodeId => {
      const inEdges = this.graph.inEdges(nodeId);
      return !inEdges || inEdges.length === 0;
    });
  }

  /**
   * Get leaf tasks (tasks with no downstream dependencies)
   */
  getLeafTasks(): string[] {
    return this.graph.nodes().filter(nodeId => {
      const outEdges = this.graph.outEdges(nodeId);
      return !outEdges || outEdges.length === 0;
    });
  }

  /**
   * Get upstream tasks (direct dependencies)
   */
  getUpstreamTasks(taskId: string): string[] {
    const predecessors = this.graph.predecessors(taskId);
    return predecessors || [];
  }

  /**
   * Get downstream tasks
   */
  getDownstreamTasks(taskId: string): string[] {
    const successors = this.graph.successors(taskId);
    return successors || [];
  }

  /**
   * Get all upstream tasks (transitive)
   */
  getAllUpstreamTasks(taskId: string): string[] {
    const visited = new Set<string>();
    const queue = [taskId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const predecessors = this.graph.predecessors(current) || [];

      predecessors.forEach(pred => {
        if (!visited.has(pred)) {
          visited.add(pred);
          queue.push(pred);
        }
      });
    }

    return Array.from(visited);
  }

  /**
   * Get all downstream tasks (transitive)
   */
  getAllDownstreamTasks(taskId: string): string[] {
    const visited = new Set<string>();
    const queue = [taskId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const successors = this.graph.successors(current) || [];

      successors.forEach(succ => {
        if (!visited.has(succ)) {
          visited.add(succ);
          queue.push(succ);
        }
      });
    }

    return Array.from(visited);
  }

  /**
   * Get task config
   */
  getTask(taskId: string): TaskConfig | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks
   */
  getTasks(): TaskConfig[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get task count
   */
  getTaskCount(): number {
    return this.tasks.size;
  }

  /**
   * Clone the DAG
   */
  clone(): DAG {
    const cloned = new DAG({ ...this.config });
    this.tasks.forEach(task => {
      cloned.addTask({ ...task });
    });
    return cloned;
  }

  /**
   * Export DAG to JSON
   */
  toJSON(): any {
    return {
      dagId: this.dagId,
      config: this.config,
      tasks: Array.from(this.tasks.values()),
      version: this.version,
    };
  }

  /**
   * Import DAG from JSON
   */
  static fromJSON(json: any): DAG {
    const dag = new DAG(json.config);
    json.tasks.forEach((task: TaskConfig) => {
      dag.addTask(task);
    });
    return dag;
  }
}
