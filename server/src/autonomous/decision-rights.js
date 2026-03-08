"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DecisionRightsEngine = void 0;
class DecisionRightsEngine {
    logger;
    state = new Map();
    constructor(logger = console) {
        this.logger = logger;
    }
    evaluateRights(agent) {
        // Logic: If performance is high, grant autonomy.
        // Score = successfulDeploys - (incidents * 5)
        const score = agent.successfulDeploys - (agent.incidentsCaused * 5);
        let role = 'observer';
        let level = 'manual';
        if (score > 50) {
            role = 'release_captain';
            level = 'autonomous';
        }
        else if (score > 10) {
            role = 'release_assistant';
            level = 'supervised';
        }
        const right = {
            role,
            assignee: agent.agentId,
            level,
            expires: new Date(Date.now() + 86400000).toISOString() // 24h lease
        };
        this.state.set(agent.agentId, right);
        return right;
    }
    exportState() {
        return Object.fromEntries(this.state);
    }
}
exports.DecisionRightsEngine = DecisionRightsEngine;
