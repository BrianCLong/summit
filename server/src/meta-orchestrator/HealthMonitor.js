"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthMonitor = void 0;
const AgentRegistry_js_1 = require("./AgentRegistry.js");
const types_js_1 = require("./types.js");
class HealthMonitor {
    registry;
    checkInterval = null;
    TIMEOUT_MS = 30000; // 30 seconds
    constructor() {
        this.registry = AgentRegistry_js_1.AgentRegistry.getInstance();
    }
    startMonitoring(intervalMs = 10000) {
        if (this.checkInterval)
            return;
        this.checkInterval = setInterval(() => {
            this.checkAgents();
        }, intervalMs);
    }
    stopMonitoring() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
    checkAgents() {
        const agents = this.registry.getAllAgents();
        const now = new Date();
        for (const agent of agents) {
            const timeSinceLastHeartbeat = now.getTime() - agent.health.lastHeartbeat.getTime();
            if (timeSinceLastHeartbeat > this.TIMEOUT_MS && agent.status !== types_js_1.AgentStatus.OFFLINE) {
                console.warn(`Agent ${agent.id} timed out. Marking as OFFLINE.`);
                this.registry.updateStatus(agent.id, types_js_1.AgentStatus.OFFLINE);
            }
        }
    }
    reportHeartbeat(agentId, metrics) {
        this.registry.updateHealth(agentId, {
            cpuUsage: metrics.cpu,
            memoryUsage: metrics.memory,
            activeTasks: metrics.activeTasks
        });
        // If agent was offline, mark it as IDLE or BUSY depending on tasks
        const agent = this.registry.getAgent(agentId);
        if (agent && agent.status === types_js_1.AgentStatus.OFFLINE) {
            this.registry.updateStatus(agentId, metrics.activeTasks > 0 ? types_js_1.AgentStatus.BUSY : types_js_1.AgentStatus.IDLE);
        }
    }
}
exports.HealthMonitor = HealthMonitor;
