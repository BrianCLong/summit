
import { SecurityIncidentPipeline } from '../services/SecurityIncidentPipeline';
import { AlertTriageV2Service } from '../services/AlertTriageV2Service';
import { Neo4jService, neo } from '../db/neo4j';
import { AdvancedAuditSystem } from '../audit/advanced-audit-system';
// Mock PrismaClient manually as it's hard to import in test env sometimes
const PrismaClient = class {};
import { Redis } from 'ioredis';
// import winston from 'winston'; // Avoiding import issue

// Mock Logger interface
interface MockLogger {
  info: any;
  warn: any;
  error: any;
  debug: any;
}

// Mock dependencies
const mockPrisma = new PrismaClient() as any;
const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
} as unknown as Redis;

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as unknown as MockLogger;

// Mock Neo4jService
const mockNeo4j = {
  // readTransaction: jest.fn(), // Removed as per previous error
  getSession: jest.fn(),
} as unknown as Neo4jService;

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
    (neo.run as jest.Mock).mockResolvedValue({ records: [] });

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

    (mockTriageService.scoreAlert as jest.Mock).mockResolvedValue({
      score: 0.9,
      recommendations: [{ action: 'investigate' }]
    });

    (mockRedis.get as jest.Mock).mockResolvedValue(JSON.stringify({
      id: 'inc-1',
      status: 'new'
    }));

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

    (mockTriageService.scoreAlert as jest.Mock).mockResolvedValue({
      score: 0.1,
      recommendations: []
    });

    const result = await pipeline.processEvent(event);

    expect(result).toBeNull();
    expect(mockRedis.set).not.toHaveBeenCalled();
  });
});
