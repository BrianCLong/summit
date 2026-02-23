import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { AgentGovernanceService } from '../governance-service.js';
import { opaAllow } from '../../policy/opaClient.js';
import { ProvenanceLedgerV2 } from '../../provenance/ledger.js';

// Mock OPA client and Provenance Ledger
jest.mock('../../policy/opaClient.js', () => ({
    opaAllow: jest.fn()
}));
jest.mock('../../provenance/ledger.js', () => ({
    ProvenanceLedgerV2: {
        getInstance: jest.fn(() => ({
            appendEntry: jest.fn()
        }))
    }
}));
jest.mock('../../utils/logger.js');

describe('AgentGovernanceService', () => {
    let governanceService: AgentGovernanceService;
    let mockLedger: any;

    beforeEach(() => {
        jest.clearAllMocks();
        governanceService = AgentGovernanceService.getInstance();
        mockLedger = ProvenanceLedgerV2.getInstance();
    });

    it('allows action when OPA returns allow: true', async () => {
        (opaAllow as any).mockResolvedValue({ allow: true });

        const agent = { id: 'test-agent', tenantId: 'tenant-1' } as any;
        const context = { tenantId: 'tenant-1', taskId: 'task-1' };

        const decision = await governanceService.evaluateAction(agent, 'data-query', context);

        expect(decision.allowed).toBe(true);
        expect(opaAllow).toHaveBeenCalledWith('maestro/governance', expect.objectContaining({
            action: 'data-query',
            tenant: 'tenant-1'
        }));
        expect((mockLedger.appendEntry as any)).toHaveBeenCalled();
    });

    it('denies action and records violation when OPA returns allow: false', async () => {
        (opaAllow as any).mockResolvedValue({ allow: false, reason: 'High risk operation' });

        const agent = { id: 'test-agent', tenantId: 'tenant-1' } as any;
        const context = { tenantId: 'tenant-1', taskId: 'task-2' };

        const decision = await governanceService.evaluateAction(agent, 'delete-entity', context);

        expect(decision.allowed).toBe(false);
        expect(decision.reason).toBe('High risk operation');
        expect(decision.violations?.[0].violationType).toBe('SECURITY_BYPASS_ATTEMPT');
        expect((mockLedger.appendEntry as any)).toHaveBeenCalledWith(expect.objectContaining({
            actionType: 'GOVERNANCE_EVALUATION'
        }));
    });
});
