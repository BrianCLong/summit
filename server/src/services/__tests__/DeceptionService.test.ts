import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';

const mockNeoRun = jest.fn();

jest.unstable_mockModule('../../db/neo4j.js', () => ({
  neo: {
    run: mockNeoRun,
  },
}));

describe('DeceptionService', () => {
  let DeceptionService: typeof import('../DeceptionService.js').DeceptionService;
  let neo: typeof import('../../db/neo4j.js').neo;
  let service: InstanceType<typeof DeceptionService>;

  beforeAll(async () => {
    const serviceModule = await import('../DeceptionService.js');
    DeceptionService = serviceModule.DeceptionService;
    const neoModule = await import('../../db/neo4j.js');
    neo = neoModule.neo;
  });

  beforeEach(() => {
    service = new DeceptionService();
    jest.clearAllMocks();
  });

  describe('deployHoneypot', () => {
    it('should create a honeypot node and return its ID', async () => {
      const config = {
        name: 'Secret DB',
        type: 'DATABASE' as const,
        vulnerabilities: ['weak_password'],
        location: 'dmz',
      };

      const tenantId = 'test-tenant';

      mockNeoRun.mockResolvedValue({
        records: [],
      });

      const id = await service.deployHoneypot(config, tenantId);

      expect(id).toBeDefined();
      expect(neo.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE (h:Honeypot:Asset'),
        expect.objectContaining({
          tenantId,
          name: config.name,
          type: config.type,
        }),
      );
    });
  });

  describe('logInteraction', () => {
    it('should create an interaction node and link it to the honeypot', async () => {
      const honeypotId = 'honeypot-1';
      const tenantId = 'test-tenant';
      const data = {
        sourceIp: '192.168.1.100',
        payload: 'SELECT * FROM users',
        timestamp: new Date(),
      };

      mockNeoRun.mockResolvedValue({
        records: [
          {
            get: (_key: string) => ({
              properties: {
                id: 'attacker-1',
                ipAddress: data.sourceIp,
                riskScore: { toNumber: () => 10 },
                techniques: [],
                firstSeen: Date.now(),
                lastSeen: Date.now(),
              },
            }),
          },
        ],
      });

      const id = await service.logInteraction(honeypotId, data, tenantId);

      expect(id).toBeDefined();
      expect(neo.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE (i:Interaction:Event'),
        expect.objectContaining({
          honeypotId,
          tenantId,
          sourceIp: data.sourceIp,
          payload: data.payload,
        }),
      );
    });
  });

  describe('generateThreatIntelligence', () => {
    it('should return a report based on interactions', async () => {
      const tenantId = 'test-tenant';

      mockNeoRun.mockResolvedValue({
        records: [
          {
            get: (key: string) => {
              const values: Record<string, any> = {
                totalHits: { toNumber: () => 150 },
                activeHoneypots: { toNumber: () => 5 },
                uniqueAttackers: [['1.2.3.4'], ['5.6.7.8']],
              };
              return values[key];
            },
          },
        ],
      });

      const report = await service.generateThreatIntelligence(tenantId);

      expect(report).toBeDefined();
      expect(report.severity).toBe('CRITICAL');
      expect(report.indicators).toHaveLength(2);
      expect(neo.run).toHaveBeenCalledWith(
        expect.stringContaining('MATCH (h:Honeypot'),
        expect.objectContaining({ tenantId }),
      );
    });

    it('should return a low severity report if no interactions', async () => {
      const tenantId = 'test-tenant';

      mockNeoRun.mockResolvedValue({
        records: [],
      });

      const report = await service.generateThreatIntelligence(tenantId);

      expect(report).toBeDefined();
      expect(report.severity).toBe('LOW');
      expect(report.narrative).toContain('No recent activity');
    });
  });
});
