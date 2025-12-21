
import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { PartnerService } from '../../src/partners/PartnerService';

// Mock getPostgresPool
const mockQuery = jest.fn() as jest.MockedFunction<any>;
const mockPool = {
  query: mockQuery,
};

jest.mock('../../src/db/postgres', () => ({
  getPostgresPool: () => mockPool,
}));

describe('PartnerService', () => {
  let service: PartnerService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = PartnerService.getInstance();

    // Mock successful DB responses
    mockQuery.mockResolvedValue({ rowCount: 1, rows: [] } as any);
  });

  test('should return strategy configuration', () => {
    const strategy = service.getStrategy();
    expect(strategy.archetypes).toContain('SI');
    expect(strategy.priorityMotions).toContain('Co-Sell');
  });

  test('should create a valid partner and persist to DB', async () => {
    const input = {
      name: 'Acme Corp',
      archetype: 'SI' as const,
      motions: ['Co-Sell' as const],
      tier: 'Gold' as const,
      status: 'Active' as const,
      icpAlignment: {
        industries: ['Finance'],
        regions: ['NA'],
        companySize: ['Enterprise'],
        valueProposition: 'Strong presence in finance sector',
      },
      channelConflictRules: {
        dealRegistrationExpiryDays: 90,
        exclusivityPeriodDays: 30,
        escalationContact: 'channel-chief@example.com',
      },
    };

    mockQuery.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          ...input,
          id: 'uuid',
          created_at: new Date(),
          updated_at: new Date(),
          icp_alignment: input.icpAlignment, // Mock DB behavior returning what was inserted (roughly)
          channel_conflict_rules: input.channelConflictRules,
          scorecard: {},
          targets: [],
          onboarding_status: {},
          legal: {}
        }]
    } as any);

    const partner = await service.createPartner(input);

    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO partners'), expect.any(Array));
    expect(partner.name).toBe('Acme Corp');
  });

  test('should reject invalid archetype', async () => {
    const input = {
      name: 'Bad Partner',
      archetype: 'InvalidType' as any,
      motions: ['Co-Sell' as const],
      tier: 'Gold' as const,
      status: 'Active' as const,
      icpAlignment: { industries: [], regions: [], companySize: [], valueProposition: '' },
      channelConflictRules: { dealRegistrationExpiryDays: 0, exclusivityPeriodDays: 0, escalationContact: '' },
    };

    await expect(service.createPartner(input)).rejects.toThrow('Invalid archetype');
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
