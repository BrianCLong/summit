/**
 * Shared Agent Memory Interface
 *
 * Provides a read-only snapshot of agent state for governance and orchestration.
 */

export interface AgentState {
  agentId: string;
  taskId: string;
  context: Record<string, unknown>;
  timestamp: number;
}

export interface SharedMemory {
  /**
   * Write a state snapshot to the shared memory.
   * This is typically an append-only operation in the underlying store.
   */
  snapshot(state: AgentState): Promise<string>;

  /**
   * Retrieve the latest state for a given agent/task.
   * Returns a read-only view.
   */
  getLatest(agentId: string, taskId: string): Promise<AgentState | null>;

  /**
   * Retrieve the full history of an agent's execution for a task.
   */
  getHistory(agentId: string, taskId: string): Promise<AgentState[]>;
}

export class InMemorySharedMemory implements SharedMemory {
  private store: Map<string, AgentState[]> = new Map();

  async snapshot(state: AgentState): Promise<string> {
    const key = `${state.agentId}:${state.taskId}`;
    if (!this.store.has(key)) {
      this.store.set(key, []);
    }
    this.store.get(key)!.push(state);
    return key; // return reference
  }

  async getLatest(agentId: string, taskId: string): Promise<AgentState | null> {
    const key = `${agentId}:${taskId}`;
    const history = this.store.get(key);
    if (!history || history.length === 0) return null;
    return history[history.length - 1];
  }

  async getHistory(agentId: string, taskId: string): Promise<AgentState[]> {
    const key = `${agentId}:${taskId}`;
    return this.store.get(key) || [];
  }
}
