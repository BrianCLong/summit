import { jest } from '@jest/globals';

export class AgentGovernanceService {
    static getInstance() {
        return new AgentGovernanceService();
    }

    async evaluateAction() {
        return {
            allowed: true,
            reason: 'Mocked for testing',
            riskScore: 0.1,
            violations: [],
        };
    }

    getAgentConfig() {
        return {
            capabilitiesWhitelist: ['*'],
            maxBudget: 1000000,
            maxExecutionTimeMs: 1000000,
            requiredApprovals: 0,
        };
    }
}

export const agentGovernance = AgentGovernanceService.getInstance();
