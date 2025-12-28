
import { jest } from '@jest/globals';
import { DefensivePsyOpsService, PsyOpsThread } from '../src/services/DefensivePsyOpsService';
import { ProvenanceLedgerV2 } from '../src/provenance/ledger.js';
import { DecisionContext } from '../src/decision/types';

// Mock DB
const mockQuery = jest.fn() as jest.Mock<any>;
const mockPool = {
  query: mockQuery,
};

// Mock Ledger
jest.mock('../src/provenance/ledger', () => {
  return {
    ProvenanceLedgerV2: {
      getInstance: jest.fn(() => ({
        appendEntry: jest.fn(),
      })),
    },
  };
});

describe('DefensivePsyOpsService Decision Context', () => {
  let service: DefensivePsyOpsService;

  beforeEach(() => {
    mockQuery.mockReset();
    service = new DefensivePsyOpsService(mockPool as any);
  });

  test('should generate correct decision context for HIGH threat', async () => {
    const mockThreat: PsyOpsThread = {
      id: 'threat-123',
      source: 'twitter',
      threat_level: 'HIGH',
      attack_vector: 'disinformation',
      narrative: 'fake news',
      sentiment_score: -0.8,
      status: 'MONITORING',
      created_at: new Date(),
      metadata: { analysis: { manipulationScore: 0.9 } }
    };

    mockQuery.mockResolvedValueOnce({ rows: [mockThreat] } as any);

    const context = await service.getThreatDecisionContext('threat-123');

    expect(context).not.toBeNull();
    expect(context!.id).toBe('decision-threat-threat-123');

    // Check Options
    const investigateOption = context!.options.find(o => o.id === 'investigate');
    expect(investigateOption?.type).toBe('RECOMMENDED');

    const counterOption = context!.options.find(o => o.id === 'counter');
    expect(counterOption?.type).toBe('RESTRICTED'); // Should be restricted for HIGH, only allowed for CRITICAL
  });

  test('should generate correct decision context for CRITICAL threat', async () => {
    const mockThreat: PsyOpsThread = {
      id: 'threat-999',
      source: 'darkweb',
      threat_level: 'CRITICAL',
      attack_vector: 'psyops',
      narrative: 'destabilization',
      sentiment_score: -0.9,
      status: 'MONITORING',
      created_at: new Date(),
      metadata: { analysis: { manipulationScore: 0.95 } }
    };

    mockQuery.mockResolvedValueOnce({ rows: [mockThreat] } as any);

    const context = await service.getThreatDecisionContext('threat-999');

    // Check Options
    const counterOption = context!.options.find(o => o.id === 'counter');
    expect(counterOption?.type).toBe('RECOMMENDED');

    const monitorOption = context!.options.find(o => o.id === 'monitor');
    expect(monitorOption?.type).toBe('AVAILABLE');
    expect(monitorOption?.riskLevel).toBe('HIGH');
  });

  test('should populate evidence and uncertainty', async () => {
    const mockThreat: PsyOpsThread = {
      id: 'threat-low-conf',
      source: 'blog',
      threat_level: 'LOW',
      attack_vector: 'spam',
      narrative: 'buy coins',
      sentiment_score: -0.2,
      status: 'MONITORING',
      created_at: new Date(),
      metadata: { analysis: { manipulationScore: 0.5 } } // Low confidence
    };

    mockQuery.mockResolvedValueOnce({ rows: [mockThreat] } as any);

    const context = await service.getThreatDecisionContext('threat-low-conf');

    expect(context!.evidence.confidence).toBe(0.5);
    expect(context!.evidence.uncertainties).toContain('Low confidence in manipulation score');
    expect(context!.evidence.missingData).toContain('Source reliability unknown');
  });
});
