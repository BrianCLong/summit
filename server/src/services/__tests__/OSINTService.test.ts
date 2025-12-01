import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { OSINTService, OSINTTarget } from '../OSINTService';
import { getNeo4jDriver, getPostgresPool } from '../../config/database.js';
import * as dns from 'node:dns/promises';

// Mock dependencies
jest.mock('../../config/database.js', () => ({
  getNeo4jDriver: jest.fn(),
  getPostgresPool: jest.fn(),
}));

jest.mock('../../utils/logger.js', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock DNS using inline definitions to avoid hoisting issues
jest.mock('node:dns/promises', () => ({
  __esModule: true,
  resolve4: jest.fn(),
  resolveMx: jest.fn(),
}));

// Mock fetch globally for the test
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({}),
    ok: true,
    status: 200,
    headers: { get: () => 'mock-server' }
  })
) as unknown as typeof fetch;

describe('OSINTService', () => {
  let service: OSINTService;
  let mockSession: any;
  let mockPool: any;

  beforeEach(() => {
    // Setup DNS Mocks
    (dns.resolve4 as jest.Mock).mockResolvedValue(['1.2.3.4'] as never);
    (dns.resolveMx as jest.Mock).mockResolvedValue([{ exchange: 'mail.example.com', priority: 10 }] as never);

    mockSession = {
      run: jest.fn().mockResolvedValue({ records: [] } as never),
      close: jest.fn().mockResolvedValue(undefined as never),
    };
    (getNeo4jDriver as jest.Mock).mockReturnValue({
      session: jest.fn().mockReturnValue(mockSession),
      close: jest.fn(),
    });

    mockPool = {
      query: jest.fn().mockResolvedValue({ rows: [] } as never),
    };
    (getPostgresPool as jest.Mock).mockReturnValue(mockPool);

    service = new OSINTService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('enrich', () => {
    it('should enrich an IP address and persist to graph', async () => {
      const target: OSINTTarget = { type: 'ip', value: '1.1.1.1' };
      const result = await service.enrich(target);

      expect(result).toBeDefined();
      expect(result?.source).toBe('geoip-provider');
      expect(result?.data.ip).toBe('1.1.1.1');

      // Verify Graph Persistence
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('MERGE (n:IPAddress {ip: $targetValue})'),
        expect.objectContaining({ targetValue: '1.1.1.1' })
      );

      // Verify Provenance
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO provenance'),
        expect.arrayContaining(['osint_target', '1.1.1.1'])
      );
    });

    it('should enrich a domain using mocked DNS', async () => {
      const target: OSINTTarget = { type: 'domain', value: 'example.com' };
      const result = await service.enrich(target);

      expect(result?.source).toBe('dns-lookup');
      expect(result?.data.a_records).toContain('1.2.3.4');

      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('MERGE (d:Domain {name: $targetValue})'),
        expect.anything()
      );
    });

    it('should throw error for invalid input', async () => {
        const target: any = { type: 'invalid_type', value: 'something' };
        await expect(service.enrich(target)).rejects.toThrow();
    });
  });

  describe('processBulk', () => {
    it('should process multiple targets with concurrency limit', async () => {
      const targets: OSINTTarget[] = [
        { type: 'ip', value: '1.1.1.1' },
        { type: 'domain', value: 'example.com' },
        { type: 'email', value: 'test@example.com' },
        { type: 'social', value: 'myhandle' }
      ];

      const results = await service.processBulk(targets, 2);

      expect(results).toHaveLength(4);
      expect(results.every(r => r.result !== null)).toBe(true);
      expect(mockSession.run).toHaveBeenCalledTimes(4);
    });
  });
});
