import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { SubgraphPackage, SubgraphStatus } from '../marketplace/types.js';

// Mock PIIDetector directly
jest.unstable_mockModule('../privacy/PIIDetector.js', () => ({
  piiDetector: {
    scanObject: jest.fn().mockImplementation(async (payload: any) => {
      // Very simple mock logic: If there's an 'ssn' key, flag it
      if (payload && typeof payload === 'object' && ('ssn' in payload || payload.text?.includes('ssn'))) {
        return { data: { hasPI: true, riskScore: 100 } };
      }
      return { data: { hasPI: false, riskScore: 0 } };
    })
  }
}));

// Mock verifyCosign
jest.unstable_mockModule('../plugins/verify.js', () => ({
  verifyCosign: jest.fn().mockImplementation(async (sig: string) => {
    return sig === 'valid_sig';
  })
}));

describe('Marketplace v2 Subgraph Federation', () => {
  let MarketplaceService: any;
  let FederationService: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();
    const serviceModule = await import('../marketplace/service.js');
    const fedModule = await import('../federation/service.js');
    MarketplaceService = serviceModule.MarketplaceService;
    FederationService = fedModule.FederationService;
  });

  it('should successfully submit a valid subgraph without PII', async () => {
    const service = MarketplaceService.getInstance();

    // Reset reputations for test isolation
    service.contributorReputations.clear();

    const pkg: SubgraphPackage = {
      id: 'sub-1',
      contributorId: 'org-1',
      payload: { indicators: ['1.1.1.1'] },
      signature: 'valid_sig'
    };

    const result = await service.submitSubgraph(pkg);

    expect(result.status).toBe(SubgraphStatus.APPROVED);
    expect(result.reputationScore).toBe(100);
    // Score should increase after successful submission
    expect(service.getReputation('org-1')).toBe(100);
  });

  it('should quarantine a subgraph containing PII (ssn)', async () => {
    const service = MarketplaceService.getInstance();
    service.contributorReputations.clear();

    const pkg: SubgraphPackage = {
      id: 'sub-2',
      contributorId: 'org-2',
      payload: { threatActor: 'APT1', ssn: '000-00-0000' },
      signature: 'valid_sig'
    };

    const result = await service.submitSubgraph(pkg);

    expect(result.status).toBe(SubgraphStatus.QUARANTINED);
    expect(result.quarantineReason).toContain('PII Detected');
    expect(result.riskScore).toBe(100);
    // Score should decrease due to PII
    expect(service.getReputation('org-2')).toBe(95);
  });

  it('should quarantine a subgraph with an invalid signature', async () => {
    const service = MarketplaceService.getInstance();
    service.contributorReputations.clear();

    const pkg: SubgraphPackage = {
      id: 'sub-3',
      contributorId: 'org-3',
      payload: { some: 'data' },
      signature: 'invalid_sig'
    };

    const result = await service.submitSubgraph(pkg);

    expect(result.status).toBe(SubgraphStatus.QUARANTINED);
    expect(result.quarantineReason).toBe('Invalid cryptographic signature');
    // Score should decrease due to invalid sig
    expect(service.getReputation('org-3')).toBe(90);
  });

  it('should immediately quarantine if contributor reputation is too low', async () => {
    const service = MarketplaceService.getInstance();
    service.contributorReputations.clear();

    // Setup low reputation
    service.contributorReputations.set('bad-org', 40);

    const pkg: SubgraphPackage = {
      id: 'sub-4',
      contributorId: 'bad-org',
      payload: { safe: 'data' },
      signature: 'valid_sig'
    };

    const result = await service.submitSubgraph(pkg);

    expect(result.status).toBe(SubgraphStatus.QUARANTINED);
    expect(result.quarantineReason).toBe('Contributor reputation below threshold');
  });

  it('should correctly format exported STIX/MISP bundles', () => {
    const payload = { threat: "malware" };
    const provenance = { signature: "valid_sig" };

    const stix = FederationService.exportToSTIX('sub-1', payload, provenance);
    expect(stix.type).toBe('bundle');
    expect(stix.objects[0].custom_properties.x_summit_payload).toEqual(payload);

    const misp = FederationService.exportToMISP('sub-1', payload, provenance);
    expect(misp.Event.Attribute[0].x_summit_payload).toEqual(payload);
  });
});
