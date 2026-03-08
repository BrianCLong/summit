"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryPersistence = void 0;
class InMemoryPersistence {
    agents = new Map();
    tasks = new Map();
    auditLog = [];
    async saveAgent(agent) {
        this.agents.set(agent.id, agent);
    }
    async getAgent(id) {
        return this.agents.get(id) || null;
    }
    async getAllAgents() {
        return Array.from(this.agents.values());
    }
    async deleteAgent(id) {
        this.agents.delete(id);
    }
    async saveTask(task) {
        this.tasks.set(task.id, task);
    }
    async getTask(id) {
        return this.tasks.get(id) || null;
    }
    async getPendingTasks() {
        return Array.from(this.tasks.values()).filter(t => t.status === 'pending');
    }
    async updateTaskStatus(id, status, assignedTo) {
        const task = this.tasks.get(id);
        if (task) {
            task.status = status;
            if (assignedTo)
                task.assignedTo = assignedTo;
            this.tasks.set(id, task);
        }
    }
    async savePolicyResult(result, context) {
        this.auditLog.push({ type: 'policy', result, context, timestamp: new Date() });
    }
    async saveConsensusResult(result) {
        this.auditLog.push({ type: 'consensus', result, timestamp: new Date() });
    }
}
exports.InMemoryPersistence = InMemoryPersistence;
