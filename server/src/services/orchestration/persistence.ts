import { Agent, AgentTask, ConsensusResult, PolicyEvaluationResult } from './types.js';

export interface PersistenceLayer {
  saveAgent(agent: Agent): Promise<void>;
  getAgent(id: string): Promise<Agent | null>;
  getAllAgents(): Promise<Agent[]>;
  deleteAgent(id: string): Promise<void>;

  saveTask(task: AgentTask): Promise<void>;
  getTask(id: string): Promise<AgentTask | null>;
  getPendingTasks(): Promise<AgentTask[]>;
  updateTaskStatus(id: string, status: string, assignedTo?: string): Promise<void>;

  savePolicyResult(result: PolicyEvaluationResult, context: any): Promise<void>;
  saveConsensusResult(result: ConsensusResult): Promise<void>;
}

export class InMemoryPersistence implements PersistenceLayer {
  private agents: Map<string, Agent> = new Map();
  private tasks: Map<string, AgentTask> = new Map();
  private auditLog: any[] = [];

  async saveAgent(agent: Agent): Promise<void> {
    this.agents.set(agent.id, agent);
  }

  async getAgent(id: string): Promise<Agent | null> {
    return this.agents.get(id) || null;
  }

  async getAllAgents(): Promise<Agent[]> {
    return Array.from(this.agents.values());
  }

  async deleteAgent(id: string): Promise<void> {
    this.agents.delete(id);
  }

  async saveTask(task: AgentTask): Promise<void> {
    this.tasks.set(task.id, task);
  }

  async getTask(id: string): Promise<AgentTask | null> {
    return this.tasks.get(id) || null;
  }

  async getPendingTasks(): Promise<AgentTask[]> {
    return Array.from(this.tasks.values()).filter(t => t.status === 'pending');
  }

  async updateTaskStatus(id: string, status: any, assignedTo?: string): Promise<void> {
    const task = this.tasks.get(id);
    if (task) {
      task.status = status;
      if (assignedTo) task.assignedTo = assignedTo;
      this.tasks.set(id, task);
    }
  }

  async savePolicyResult(result: PolicyEvaluationResult, context: any): Promise<void> {
    this.auditLog.push({ type: 'policy', result, context, timestamp: new Date() });
  }

  async saveConsensusResult(result: ConsensusResult): Promise<void> {
    this.auditLog.push({ type: 'consensus', result, timestamp: new Date() });
  }
}
