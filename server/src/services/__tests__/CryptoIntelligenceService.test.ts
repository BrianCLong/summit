import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { CryptoIntelligenceService } from '../CryptoIntelligenceService.js';
import { getNeo4jDriver } from '../../db/neo4j.js';

// Mock getNeo4jDriver
jest.mock('../../db/neo4j.js', () => ({
  getNeo4jDriver: jest.fn(),
}));

describe('CryptoIntelligenceService', () => {
  let service: CryptoIntelligenceService;
  let mockDriver: any;
  let mockSession: any;

  beforeEach(() => {
    mockSession = {
      run: jest.fn(),
      close: jest.fn(),
    };
    mockDriver = {
      session: jest.fn().mockReturnValue(mockSession),
    };
    (getNeo4jDriver as jest.Mock).mockReturnValue(mockDriver);

    // Reset instance to ensure fresh start
    // @ts-ignore
    CryptoIntelligenceService.instance = undefined;
    service = CryptoIntelligenceService.getInstance();
  });

  describe('analyzeTransactionPattern', () => {
    it('should detect structuring pattern', async () => {
      const result = await service.analyzeTransactionPattern('0xdeadbeef', 'ETH');
      expect(result.riskLevel).toBe('high');
      expect(result.patternType).toBe('structuring');
    });

    it('should return low risk for normal transactions', async () => {
      const result = await service.analyzeTransactionPattern('0x12345678', 'ETH');
      expect(result.riskLevel).toBe('low');
    });
  });

  describe('clusterWallets', () => {
    it('should return related addresses from graph', async () => {
      mockSession.run.mockResolvedValue({
        records: [
          { get: (key: string) => key === 'relatedAddress' ? '0xrelated1' : null },
          { get: (key: string) => key === 'relatedAddress' ? '0xrelated2' : null },
        ],
      });

      const result = await service.clusterWallets('0xmain', 'ETH');
      expect(result.mainAddress).toBe('0xmain');
      expect(result.relatedAddresses).toContain('0xrelated1');
      expect(result.relatedAddresses).toContain('0xrelated2');
    });

    it('should return mock data if graph is empty', async () => {
        mockSession.run.mockResolvedValue({ records: [] });

        const result = await service.clusterWallets('0xempty', 'ETH');
        expect(result.relatedAddresses.length).toBeGreaterThan(0);
        expect(result.confidence).toBe(0.85);
      });
  });

  describe('detectMixingService', () => {
      it('should detect known mixers', async () => {
          const result = await service.detectMixingService('0xtornado', 'ETH');
          expect(result.isMixer).toBe(true);
          expect(result.serviceName).toBe('TornadoCash');
      });
  });

  describe('monitorDarkWeb', () => {
      it('should return hits for specific keywords', async () => {
          const result = await service.monitorDarkWeb('SilkRoad', 'ransom');
          expect(result.length).toBeGreaterThan(0);
          expect(result[0].keyword).toBe('ransom');
      });
  });
});
