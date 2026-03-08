"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaOrchestrator = void 0;
const AgentRegistry_js_1 = require("./AgentRegistry.js");
const HealthMonitor_js_1 = require("./HealthMonitor.js");
const NegotiationEngine_js_1 = require("./NegotiationEngine.js");
const GovernanceExtension_js_1 = require("./GovernanceExtension.js");
class MetaOrchestrator {
    static instance;
    registry;
    healthMonitor;
    negotiationEngine;
    governance;
    constructor() {
        this.registry = AgentRegistry_js_1.AgentRegistry.getInstance();
        this.healthMonitor = new HealthMonitor_js_1.HealthMonitor();
        this.negotiationEngine = new NegotiationEngine_js_1.NegotiationEngine();
        this.governance = new GovernanceExtension_js_1.GovernanceExtension();
        this.healthMonitor.startMonitoring();
    }
    static getInstance() {
        if (!MetaOrchestrator.instance) {
            MetaOrchestrator.instance = new MetaOrchestrator();
        }
        return MetaOrchestrator.instance;
    }
    registerAgent(agent) {
        return this.registry.registerAgent(agent);
    }
    getAgents(tenantId) {
        return this.registry.getAllAgents(tenantId);
    }
    async createNegotiation(initiatorId, participantIds, topic, context, tenantId) {
        return this.negotiationEngine.initiateNegotiation(initiatorId, participantIds, topic, context, tenantId);
    }
    async submitProposal(negotiationId, agentId, content) {
        return this.negotiationEngine.submitProposal(negotiationId, agentId, content);
    }
}
exports.MetaOrchestrator = MetaOrchestrator;
