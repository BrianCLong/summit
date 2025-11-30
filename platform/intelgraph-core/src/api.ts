import { GraphPersistenceAdapter } from './adapter/interface.js';
import { GraphNode } from './types.js';

export class GraphQueryAPI {
  constructor(private adapter: GraphPersistenceAdapter) {}

  async getTasksForTenant(tenantId: string): Promise<GraphNode[]> {
    // 1. Find the tenant node
    const tenantNode = await this.adapter.getNode(tenantId);
    if (!tenantNode || tenantNode.label !== 'Tenant') return [];

    const edges = await this.adapter.getEdgesTo(tenantId, 'TASK_OF_TENANT');
    const tasks: GraphNode[] = [];
    for (const edge of edges) {
      const taskNode = await this.adapter.getNode(edge.from);
      if (taskNode) tasks.push(taskNode);
    }
    return tasks;
  }

  async getGovernanceDecisionsForTenant(tenantId: string): Promise<GraphNode[]> {
    // Decision --(DECISION_FOR_TENANT??)--> Tenant
    // Or we just query nodes with label GovernanceDecision and prop tenantId
    return this.adapter.queryNodes('GovernanceDecision', { tenantId });
  }

  async findTasksByType(type: string): Promise<GraphNode[]> {
    return this.adapter.queryNodes('Task', { type });
  }
}
