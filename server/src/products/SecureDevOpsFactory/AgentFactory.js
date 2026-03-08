"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentFactory = void 0;
const MTLSManager_js_1 = require("./MTLSManager.js");
const ReviewAgent_js_1 = require("./ReviewAgent.js");
class AgentFactory {
    mtlsManager;
    constructor() {
        this.mtlsManager = new MTLSManager_js_1.MTLSManager();
    }
    /**
     * Spawns a swarm of agents to process a PR.
     * @param prId The ID of the PR to review.
     * @param prContent The content of the PR.
     */
    async spawnAgentSwarm(prId, prContent) {
        const start = Date.now();
        console.log(`[Factory] Spawning Quantum-Secure Agent Swarm for PR ${prId}...`);
        // Spawn agents
        const secAgent = new ReviewAgent_js_1.ReviewAgent('security');
        const perfAgent = new ReviewAgent_js_1.ReviewAgent('performance');
        const styleAgent = new ReviewAgent_js_1.ReviewAgent('style');
        // Provision mTLS identities
        const secCert = this.mtlsManager.generateCertificate(secAgent.id);
        const perfCert = this.mtlsManager.generateCertificate(perfAgent.id);
        // Simulate secure inter-agent comms
        this.mtlsManager.simulateHandshake(secAgent.id, perfAgent.id);
        // Execute reviews in parallel
        const results = await Promise.all([
            secAgent.review(prContent),
            perfAgent.review(prContent),
            styleAgent.review(prContent)
        ]);
        // Aggregate results
        const minResistance = Math.min(...results.map(r => r.exploitResistanceScore));
        const blocked = results.some(r => r.status === 'failure');
        return {
            prId,
            agentResults: results,
            aggregateResistance: minResistance,
            deploymentStatus: blocked ? 'blocked' : 'deployed',
            durationMs: Date.now() - start
        };
    }
}
exports.AgentFactory = AgentFactory;
