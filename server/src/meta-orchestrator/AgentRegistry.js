"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentRegistry = void 0;
const types_js_1 = require("./types.js");
class AgentRegistry {
    static instance;
    agents = new Map();
    constructor() { }
    static getInstance() {
        if (!AgentRegistry.instance) {
            AgentRegistry.instance = new AgentRegistry();
        }
        return AgentRegistry.instance;
    }
    registerAgent(agent) {
        const newAgent = {
            ...agent,
            status: types_js_1.AgentStatus.IDLE,
            health: {
                cpuUsage: 0,
                memoryUsage: 0,
                lastHeartbeat: new Date(),
                activeTasks: 0,
                errorRate: 0
            }
        };
        this.agents.set(agent.id, newAgent);
        return newAgent;
    }
    getAgent(id) {
        return this.agents.get(id);
    }
    getAllAgents(tenantId) {
        const allAgents = Array.from(this.agents.values());
        if (tenantId) {
            return allAgents.filter(a => a.tenantId === tenantId);
        }
        return allAgents;
    }
    updateStatus(id, status) {
        const agent = this.agents.get(id);
        if (agent) {
            agent.status = status;
            this.agents.set(id, agent);
        }
    }
    updateHealth(id, health) {
        const agent = this.agents.get(id);
        if (agent) {
            agent.health = { ...agent.health, ...health, lastHeartbeat: new Date() };
            this.agents.set(id, agent);
        }
    }
    removeAgent(id) {
        return this.agents.delete(id);
    }
}
exports.AgentRegistry = AgentRegistry;
