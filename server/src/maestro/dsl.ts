
import { MaestroSpec, MaestroNode, MaestroTask, RunId, TenantId } from './model.js';

export class MaestroDSL {
  /**
   * Validates a MaestroSpec to ensure it is a valid DAG (no cycles)
   * and that all references are valid.
   */
  static validate(spec: MaestroSpec): { valid: boolean; error?: string } {
    if (!spec.nodes || spec.nodes.length === 0) {
      return { valid: false, error: 'Spec must have at least one node' };
    }

    // check for duplicate node IDs
    const nodeIds = new Set<string>();
    for (const node of spec.nodes) {
      if (nodeIds.has(node.id)) {
        return { valid: false, error: `Duplicate node ID: ${node.id}` };
      }
      nodeIds.add(node.id);
    }

    // check edges reference valid nodes
    for (const edge of spec.edges) {
      if (!nodeIds.has(edge.from)) {
        return { valid: false, error: `Edge source invalid: ${edge.from}` };
      }
      if (!nodeIds.has(edge.to)) {
        return { valid: false, error: `Edge target invalid: ${edge.to}` };
      }
    }

    // check for cycles
    if (this.hasCycle(spec)) {
      return { valid: false, error: 'Spec contains a cycle' };
    }

    return { valid: true };
  }

  private static hasCycle(spec: MaestroSpec): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    // build adjacency list
    const adj = new Map<string, string[]>();
    for (const node of spec.nodes) {
      adj.set(node.id, []);
    }
    for (const edge of spec.edges) {
      adj.get(edge.from)?.push(edge.to);
    }

    const detect = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const neighbors = adj.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (detect(neighbor)) return true;
        } else if (recursionStack.has(neighbor)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const node of spec.nodes) {
      if (!visited.has(node.id)) {
        if (detect(node.id)) return true;
      }
    }

    return false;
  }

  /**
   * Compiles a Spec into a set of initial Tasks for a Run.
   * This handles creating the Task entities with correct dependencies.
   */
  static compileToTasks(
    spec: MaestroSpec,
    runId: RunId,
    tenantId: TenantId,
    input: unknown
  ): MaestroTask[] {
    const tasks: MaestroTask[] = [];
    const nodeIdToTaskId = new Map<string, string>(); // spec node id -> db task id

    // Create a task for each node
    // Note: This simplistic compilation creates ALL tasks upfront.
    // In a more advanced engine (supporting loops or dynamic subflows),
    // we might only create the entry tasks. But for a DAG workflow,
    // creating all tasks as 'pending' is a good pattern.

    for (const node of spec.nodes) {
      const taskId = crypto.randomUUID();
      nodeIdToTaskId.set(node.id, taskId);

      // Determine task kind based on node kind or ref
      // If node.kind is 'task', we look at node.ref (e.g. 'llm_call')
      let taskKind = 'custom';
      if (node.kind === 'task') {
        taskKind = node.ref;
      } else if (node.kind === 'agent_call') {
        taskKind = 'agent_call';
      } else if (node.kind === 'subflow') {
        taskKind = 'subflow';
      }

      const task: MaestroTask = {
        id: taskId,
        runId,
        tenantId,
        name: node.name || node.id,
        kind: taskKind as any, // Cast to known kind
        status: 'pending',
        dependsOn: [], // filled later
        attempt: 0,
        maxAttempts: (node.config?.maxAttempts as number) || 3,
        backoffStrategy: (node.config?.backoffStrategy as any) || 'exponential',
        payload: {
          ...((node.config || {})),
          // Merge inputMapping logic would happen at runtime execution,
          // or we store the mapping definition here in payload/metadata
          inputMapping: node.inputMapping,
          ref: node.ref
        },
        metadata: {
          nodeId: node.id
        }
      };

      tasks.push(task);
    }

    // Link dependencies
    for (const edge of spec.edges) {
      const parentTaskId = nodeIdToTaskId.get(edge.from);
      const childTaskId = nodeIdToTaskId.get(edge.to);

      if (parentTaskId && childTaskId) {
        const childTask = tasks.find(t => t.id === childTaskId);
        if (childTask) {
          childTask.dependsOn.push(parentTaskId);
        }
      }
    }

    // Determine which tasks are ready (no dependencies)
    for (const task of tasks) {
      if (task.dependsOn.length === 0) {
        task.status = 'ready';
      }
    }

    return tasks;
  }
}
