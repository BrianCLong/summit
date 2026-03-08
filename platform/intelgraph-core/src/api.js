"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphQueryAPI = void 0;
class GraphQueryAPI {
    adapter;
    constructor(adapter) {
        this.adapter = adapter;
    }
    async getTasksForTenant(tenantId) {
        // 1. Find the tenant node
        const tenantNode = await this.adapter.getNode(tenantId);
        if (!tenantNode || tenantNode.label !== 'Tenant')
            return [];
        const edges = await this.adapter.getEdgesTo(tenantId, 'TASK_OF_TENANT');
        const tasks = [];
        for (const edge of edges) {
            const taskNode = await this.adapter.getNode(edge.from);
            if (taskNode)
                tasks.push(taskNode);
        }
        return tasks;
    }
    async getGovernanceDecisionsForTenant(tenantId) {
        // Decision --(DECISION_FOR_TENANT??)--> Tenant
        // Or we just query nodes with label GovernanceDecision and prop tenantId
        return this.adapter.queryNodes('GovernanceDecision', { tenantId });
    }
    async findTasksByType(type) {
        return this.adapter.queryNodes('Task', { type });
    }
}
exports.GraphQueryAPI = GraphQueryAPI;
