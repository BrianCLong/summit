
import { MTLSManager } from './MTLSManager.js';
import { ReviewAgent, AgentResult } from './ReviewAgent.js';

export interface SwarmResult {
    prId: string;
    agentResults: AgentResult[];
    aggregateResistance: number;
    deploymentStatus: 'deployed' | 'blocked';
    durationMs: number;
}

export class AgentFactory {
    private mtlsManager: MTLSManager;

    constructor() {
        this.mtlsManager = new MTLSManager();
    }

    /**
     * Spawns a swarm of agents to process a PR.
     * @param prId The ID of the PR to review.
     * @param prContent The content of the PR.
     */
    async spawnAgentSwarm(prId: string, prContent: string): Promise<SwarmResult> {
        const start = Date.now();
        console.log(`[Factory] Spawning Quantum-Secure Agent Swarm for PR ${prId}...`);

        // Spawn agents
        const secAgent = new ReviewAgent('security');
        const perfAgent = new ReviewAgent('performance');
        const styleAgent = new ReviewAgent('style');

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
