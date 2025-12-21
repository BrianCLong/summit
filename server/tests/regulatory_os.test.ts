import { RegulatoryService } from '../src/services/RegulatoryService.js';
import { describe, expect, it, jest, beforeAll } from '@jest/globals';

// Mock dependencies
jest.mock('../src/services/provenance-ledger.js', () => ({
  ProvenanceLedgerService: {
    getInstance: () => ({
      registerClaim: jest.fn<() => Promise<any>>().mockResolvedValue({}),
      createDisclosureBundle: jest.fn<() => Promise<any>>().mockResolvedValue({})
    })
  }
}));

// Mock PolicyEngine to avoid loading file config
jest.mock('../src/services/PolicyEngine.js', () => {
    return {
        PolicyEngine: {
            getInstance: () => ({
                evaluate: jest.fn().mockImplementation((context: any) => {
                     // Simulate Logic from PolicyEngine.ts
                     if (context.action === 'interact_regulator') {
                        const interaction = context.resource;
                        if (interaction.type === 'regulator' && interaction.channel === 'private') {
                            return Promise.resolve({ allow: false, reason: 'Private regulatory interaction prohibited' });
                        }
                     }
                     return Promise.resolve({ allow: true });
                })
            })
        }
    }
});


describe('Regulatory OS Integration', () => {
  let service: RegulatoryService;

  beforeAll(() => {
    service = RegulatoryService.getInstance();
  });

  it('should resolve jurisdiction and allow valid action', async () => {
    const user = { id: 'u1', role: 'admin', tenantId: 't1', region: 'US' };
    const result = await service.evaluateAction('normal_action', user, { some: 'data' });

    expect(result.jurisdiction.region).toBe('US');
    expect(result.decision.allow).toBe(true);
  });

  it('should block private regulator interaction (Ethics Guardrail)', async () => {
    const user = { id: 'u1', role: 'admin', tenantId: 't1', region: 'US' };
    const resource = {
        type: 'regulator',
        channel: 'private',
        offer: null
    };

    const result = await service.evaluateAction('interact_regulator', user, resource);

    expect(result.decision.allow).toBe(false);
    expect(result.decision.reason).toContain('Private regulatory interaction prohibited');
  });

  it('should export evidence in correct schema', async () => {
      const bundle = await service.exportEvidence({
          requestId: 'req-123',
          jurisdiction: 'EU'
      });

      expect(bundle.request_id).toBe('req-123');
      expect(bundle.jurisdiction).toBe('EU');
      expect(bundle.decision_trace).toBeDefined();
      expect(bundle.timestamp).toBeDefined();
  });
});
