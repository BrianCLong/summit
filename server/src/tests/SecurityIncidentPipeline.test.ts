import { SecurityIncidentPipeline } from '../services/SecurityIncidentPipeline.js';
import { AlertTriageV2Service } from '../services/AlertTriageV2Service.js';
import { neo } from '../db/neo4j.js';
import { AdvancedAuditSystem } from '../audit/advanced-audit-system.js';
import { jest } from '@jest/globals';
// Mock PrismaClient manually as it's hard to import in test env sometimes
const PrismaClient = class {};
import { Redis } from 'ioredis';
// import winston from 'winston'; // Avoiding import issue

// Mock Logger interface
interface MockLogger {
  info: jest.Mock;
  warn: jest.Mock;
  error: jest.Mock;
  debug: jest.Mock;
}

// Mock dependencies
const mockPrisma = new PrismaClient() as unknown as Record<string, unknown>;
const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
} as unknown as Redis;

const mockLogger: MockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as unknown as MockLogger;

// Mock Neo4jService
const mockNeo4j = {
  getSession: jest.fn(),
};

// Mock the neo helper
jest.mock('../db/neo4j', () => {
  return {
    Neo4jService: jest.fn(),
    neo: {
      run: jest.fn()
    }
  };
});

const mockAuditSystem = {
  // Add methods if needed by pipeline
} as unknown as AdvancedAuditSystem;

const mockTriageService = {
  scoreAlert: jest.fn(),
} as unknown as AlertTriageV2Service;

describe('SecurityIncidentPipeline', () => {
  let pipeline: SecurityIncidentPipeline;

  beforeEach(() => {
    // We need to mock neo.run return
    const neoRun = neo.run as unknown as jest.MockedFunction<
      (query: string, params?: any) => Promise<any>
    >;
    neoRun.mockResolvedValue({ records: [] });

    pipeline = new SecurityIncidentPipeline(
      mockPrisma,
      mockRedis,
      mockLogger as any,
      mockNeo4j,
      mockAuditSystem,
      mockTriageService
    );
    jest.clearAllMocks();
  });

  it('should process a high-score event and create an incident', async () => {
    // Setup
    const event = {
      id: 'evt-1',
      type: 'test-event',
      severity: 'critical' as const,
      timestamp: new Date(),
      tenantId: 'tenant-1',
      actorId: 'user-1',
      details: {}
    };

    const scoreAlertMock = mockTriageService.scoreAlert as unknown as jest.MockedFunction<
      (eventId: string, event: any) => Promise<any>
    >;
    scoreAlertMock.mockResolvedValue({
      score: 0.9,
      recommendations: [{ action: 'investigate' }]
    } as any);

    const redisGetMock = mockRedis.get as unknown as jest.MockedFunction<
      (key: string) => Promise<string | null>
    >;
    redisGetMock.mockResolvedValue(JSON.stringify({
      id: 'inc-1',
      status: 'new'
    }) as any);

    // Execute
    const result = await pipeline.processEvent(event);

    // Verify
    expect(mockTriageService.scoreAlert).toHaveBeenCalledWith(event.id, expect.objectContaining({
      id: 'evt-1'
    }));

    expect(mockRedis.set).toHaveBeenCalledTimes(3); // Create, Evidence, Owner
    expect(mockLogger.warn).toHaveBeenCalled(); // Alert raised
    expect(result).toBeDefined();

    // Check if graph dump was attempted
    expect(neo.run).toHaveBeenCalled();
  });

  it('should skip incident creation for low scores', async () => {
    const event = {
      id: 'evt-low',
      type: 'low-risk',
      severity: 'low' as const,
      timestamp: new Date(),
      tenantId: 'tenant-1',
      details: {}
    };

    const scoreAlertMock = mockTriageService.scoreAlert as unknown as jest.MockedFunction<
      (eventId: string, event: any) => Promise<any>
    >;
    scoreAlertMock.mockResolvedValue({
      score: 0.1,
      recommendations: []
    } as any);

    const result = await pipeline.processEvent(event);

    expect(result).toBeNull();
    expect(mockRedis.set).not.toHaveBeenCalled();
  });
});
