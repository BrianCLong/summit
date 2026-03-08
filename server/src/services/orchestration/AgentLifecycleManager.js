"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentLifecycleManager = void 0;
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const events_1 = require("events");
class AgentLifecycleManager extends events_1.EventEmitter {
    static instance;
    agents = new Map();
    heartbeatInterval;
    constructor() {
        super();
        // Check for stale agents every 30 seconds
        this.heartbeatInterval = setInterval(() => this.checkHeartbeats(), 30000);
    }
    static getInstance() {
        if (!AgentLifecycleManager.instance) {
            AgentLifecycleManager.instance = new AgentLifecycleManager();
        }
        return AgentLifecycleManager.instance;
    }
    registerAgent(agentDef) {
        const agent = {
            ...agentDef,
            constraints: agentDef.constraints || {},
            status: 'idle',
            lastHeartbeat: new Date()
        };
        this.agents.set(agent.id, agent);
        this.emit('agent_registered', agent);
        logger_js_1.default.info(`Agent registered: ${agent.name} (${agent.id})`);
        return agent;
    }
    unregisterAgent(agentId) {
        if (this.agents.has(agentId)) {
            this.agents.delete(agentId);
            this.emit('agent_unregistered', agentId);
            logger_js_1.default.info(`Agent unregistered: ${agentId}`);
        }
    }
    heartbeat(agentId) {
        const agent = this.agents.get(agentId);
        if (agent) {
            agent.lastHeartbeat = new Date();
            if (agent.status === 'offline') {
                agent.status = 'idle'; // Recover status if it was offline
            }
        }
    }
    updateStatus(agentId, status) {
        const agent = this.agents.get(agentId);
        if (agent) {
            const oldStatus = agent.status;
            agent.status = status;
            this.emit('agent_status_change', { agentId, oldStatus, newStatus: status });
        }
    }
    getAgent(agentId) {
        return this.agents.get(agentId);
    }
    getAllAgents() {
        return Array.from(this.agents.values());
    }
    getAgentsByCapability(capabilityName) {
        return this.getAllAgents().filter(agent => agent.status !== 'offline' &&
            agent.status !== 'terminated' &&
            agent.capabilities.some(cap => cap.name === capabilityName));
    }
    checkHeartbeats() {
        const now = new Date().getTime();
        const TIMEOUT_MS = 60000; // 1 minute timeout
        for (const agent of this.agents.values()) {
            if (agent.status === 'terminated')
                continue;
            if (now - agent.lastHeartbeat.getTime() > TIMEOUT_MS) {
                if (agent.status !== 'offline') {
                    logger_js_1.default.warn(`Agent heartbeat timeout: ${agent.name} (${agent.id})`);
                    this.updateStatus(agent.id, 'offline');
                }
            }
        }
    }
    shutdown() {
        clearInterval(this.heartbeatInterval);
    }
}
exports.AgentLifecycleManager = AgentLifecycleManager;
