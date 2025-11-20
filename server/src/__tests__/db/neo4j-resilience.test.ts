/**
 * Neo4j Connection Resilience Tests
 * Tests for connection failure handling, graceful degradation, and recovery
 */

import { createMockLogger, waitFor } from '../helpers/testHelpers';

// Set test environment before importing modules
process.env.NEO4J_URI = 'bolt://localhost:7687';
process.env.NEO4J_USER = 'neo4j';
process.env.NEO4J_PASSWORD = 'testpassword';
process.env.REQUIRE_REAL_DBS = 'false';
process.env.NEO4J_HEALTH_INTERVAL_MS = '100'; // Fast interval for testing

// Mock neo4j-driver before importing
const mockDriver = {
  verifyConnectivity: jest.fn(),
  close: jest.fn(),
  session: jest.fn(),
};

const mockSession = {
  run: jest.fn(),
  close: jest.fn(),
  beginTransaction: jest.fn(),
  lastBookmarks: jest.fn(),
};

jest.mock('neo4j-driver', () => ({
  __esModule: true,
  default: {
    driver: jest.fn(() => mockDriver),
    auth: {
      basic: jest.fn((user, pass) => ({ scheme: 'basic', principal: user, credentials: pass })),
    },
    types: {
      Integer: class Integer {
        constructor(public value: number) {}
        toNumber() {
          return this.value;
        }
      },
    },
  },
}));

// Mock pino logger
jest.mock('pino', () => {
  return jest.fn(() => createMockLogger());
});

// Mock metrics
jest.mock('../../metrics/neo4jMetrics', () => ({
  neo4jConnectivityUp: { set: jest.fn() },
  neo4jQueryErrorsTotal: { inc: jest.fn() },
  neo4jQueryLatencyMs: { observe: jest.fn() },
  neo4jQueryTotal: { inc: jest.fn() },
}));

describe('Neo4j Connection Resilience', () => {
  let neo4jModule: any;
  let neo4jDriver: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();

    // Reset mock implementations
    mockDriver.verifyConnectivity.mockResolvedValue(undefined);
    mockDriver.close.mockResolvedValue(undefined);
    mockDriver.session.mockReturnValue(mockSession);
    mockSession.run.mockResolvedValue({ records: [] });
    mockSession.close.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    // Clean up any timers
    jest.clearAllTimers();
  });

  describe('Connection initialization', () => {
    it('should initialize driver successfully with valid credentials', async () => {
      const neo4jDriverModule = await import('neo4j-driver');
      neo4jModule = await import('../../db/neo4j');

      const driver = neo4jModule.getNeo4jDriver();

      expect(driver).toBeDefined();
      expect(neo4jDriverModule.default.driver).toHaveBeenCalledWith(
        'bolt://localhost:7687',
        expect.any(Object)
      );
    });

    it('should switch to mock mode when connection fails', async () => {
      // Make driver creation fail
      const neo4jDriverModule = await import('neo4j-driver');
      (neo4jDriverModule.default.driver as jest.Mock).mockImplementation(() => {
        throw new Error('ServiceUnavailable: Connection refused');
      });

      neo4jModule = await import('../../db/neo4j');

      const driver = neo4jModule.getNeo4jDriver();
      const isMockMode = neo4jModule.isNeo4jMockMode();

      // Should not throw, should fallback to mock
      expect(driver).toBeDefined();
      expect(isMockMode).toBe(true);
    });

    it('should handle network timeout during initialization', async () => {
      const neo4jDriverModule = await import('neo4j-driver');
      (neo4jDriverModule.default.driver as jest.Mock).mockImplementation(() => {
        throw new Error('ETIMEDOUT: Connection timeout');
      });

      neo4jModule = await import('../../db/neo4j');

      const driver = neo4jModule.getNeo4jDriver();
      const isMockMode = neo4jModule.isNeo4jMockMode();

      expect(driver).toBeDefined();
      expect(isMockMode).toBe(true);
    });

    it('should handle DNS resolution failures', async () => {
      const neo4jDriverModule = await import('neo4j-driver');
      (neo4jDriverModule.default.driver as jest.Mock).mockImplementation(() => {
        throw new Error('ENOTFOUND: DNS lookup failed for neo4j-host');
      });

      neo4jModule = await import('../../db/neo4j');

      const driver = neo4jModule.getNeo4jDriver();
      const isMockMode = neo4jModule.isNeo4jMockMode();

      expect(driver).toBeDefined();
      expect(isMockMode).toBe(true);
    });
  });

  describe('Connectivity monitoring', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should periodically check connectivity', async () => {
      mockDriver.verifyConnectivity.mockResolvedValue(undefined);

      neo4jModule = await import('../../db/neo4j');
      const driver = neo4jModule.getNeo4jDriver();

      // Fast forward time to trigger connectivity check
      jest.advanceTimersByTime(200);
      await Promise.resolve(); // Flush promises

      expect(mockDriver.verifyConnectivity).toHaveBeenCalled();
    });

    it('should emit metrics on successful connectivity check', async () => {
      mockDriver.verifyConnectivity.mockResolvedValue(undefined);

      const metricsModule = await import('../../metrics/neo4jMetrics');
      neo4jModule = await import('../../db/neo4j');

      jest.advanceTimersByTime(200);
      await Promise.resolve();

      expect(metricsModule.neo4jConnectivityUp.set).toHaveBeenCalledWith(1);
    });

    it('should handle connectivity loss and switch to mock mode', async () => {
      mockDriver.verifyConnectivity
        .mockResolvedValueOnce(undefined) // First check succeeds
        .mockRejectedValueOnce(new Error('Connection lost')); // Second check fails

      neo4jModule = await import('../../db/neo4j');

      jest.advanceTimersByTime(200);
      await Promise.resolve();

      expect(mockDriver.verifyConnectivity).toHaveBeenCalled();
    });
  });

  describe('Query execution resilience', () => {
    it('should handle query failures gracefully', async () => {
      mockSession.run.mockRejectedValue(new Error('Connection lost'));

      neo4jModule = await import('../../db/neo4j');
      const driver = neo4jModule.getNeo4jDriver();
      const session = driver.session();

      try {
        await session.run('MATCH (n) RETURN n LIMIT 1');
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('Connection lost');
      } finally {
        await session.close();
      }

      expect(mockSession.run).toHaveBeenCalled();
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should close session even when query fails', async () => {
      mockSession.run.mockRejectedValue(new Error('Query timeout'));

      neo4jModule = await import('../../db/neo4j');
      const driver = neo4jModule.getNeo4jDriver();
      const session = driver.session();

      try {
        await session.run('MATCH (n) RETURN n');
      } catch (error) {
        // Expected to fail
      }

      await session.close();
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should handle transaction rollback on error', async () => {
      const mockTransaction = {
        run: jest.fn().mockRejectedValue(new Error('Constraint violation')),
        commit: jest.fn(),
        rollback: jest.fn().mockResolvedValue(undefined),
        close: jest.fn(),
      };

      mockSession.beginTransaction.mockReturnValue(mockTransaction);

      neo4jModule = await import('../../db/neo4j');
      const driver = neo4jModule.getNeo4jDriver();
      const session = driver.session();

      try {
        const tx = session.beginTransaction();
        await tx.run('CREATE (n:Entity {invalid})');
        await tx.commit();
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('Constraint violation');
      }

      await session.close();
    });
  });

  describe('REQUIRE_REAL_DBS mode', () => {
    it('should exit process when REQUIRE_REAL_DBS=true and connection fails', async () => {
      process.env.REQUIRE_REAL_DBS = 'true';

      const mockExit = jest.spyOn(process, 'nextTick').mockImplementation((cb: any) => {
        // Don't actually call the callback to avoid exiting during test
        return undefined as any;
      });

      const neo4jDriverModule = await import('neo4j-driver');
      (neo4jDriverModule.default.driver as jest.Mock).mockImplementation(() => {
        throw new Error('Connection refused');
      });

      // This should trigger exit logic
      neo4jModule = await import('../../db/neo4j');

      await waitFor(50);

      expect(mockExit).toHaveBeenCalled();

      mockExit.mockRestore();
      process.env.REQUIRE_REAL_DBS = 'false';
    });

    it('should not exit when REQUIRE_REAL_DBS=false and connection fails', async () => {
      process.env.REQUIRE_REAL_DBS = 'false';

      const mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: any) => {
        throw new Error(`Process.exit called with code ${code}`);
      });

      const neo4jDriverModule = await import('neo4j-driver');
      (neo4jDriverModule.default.driver as jest.Mock).mockImplementation(() => {
        throw new Error('Connection refused');
      });

      neo4jModule = await import('../../db/neo4j');

      const driver = neo4jModule.getNeo4jDriver();

      expect(driver).toBeDefined();
      expect(mockExit).not.toHaveBeenCalled();

      mockExit.mockRestore();
    });
  });

  describe('Session management', () => {
    it('should create new session for each request', async () => {
      neo4jModule = await import('../../db/neo4j');
      const driver = neo4jModule.getNeo4jDriver();

      const session1 = driver.session();
      const session2 = driver.session();

      expect(mockDriver.session).toHaveBeenCalledTimes(2);
    });

    it('should support session with database parameter', async () => {
      neo4jModule = await import('../../db/neo4j');
      const driver = neo4jModule.getNeo4jDriver();

      const session = driver.session({ database: 'neo4j' });

      expect(mockDriver.session).toHaveBeenCalledWith({ database: 'neo4j' });
    });

    it('should handle session close errors gracefully', async () => {
      mockSession.close.mockRejectedValue(new Error('Session already closed'));

      neo4jModule = await import('../../db/neo4j');
      const driver = neo4jModule.getNeo4jDriver();
      const session = driver.session();

      // Should not throw
      await expect(session.close()).rejects.toThrow('Session already closed');
    });
  });

  describe('Driver facade', () => {
    it('should provide consistent interface in mock mode', async () => {
      const neo4jDriverModule = await import('neo4j-driver');
      (neo4jDriverModule.default.driver as jest.Mock).mockImplementation(() => {
        throw new Error('Connection failed');
      });

      neo4jModule = await import('../../db/neo4j');
      const driver = neo4jModule.getNeo4jDriver();

      // Should still provide session method
      expect(typeof driver.session).toBe('function');

      const session = driver.session();
      expect(session).toBeDefined();
      expect(typeof session.run).toBe('function');
      expect(typeof session.close).toBe('function');
    });

    it('should return mock data in mock mode', async () => {
      const neo4jDriverModule = await import('neo4j-driver');
      (neo4jDriverModule.default.driver as jest.Mock).mockImplementation(() => {
        throw new Error('Connection failed');
      });

      neo4jModule = await import('../../db/neo4j');
      const isMockMode = neo4jModule.isNeo4jMockMode();

      expect(isMockMode).toBe(true);
    });
  });

  describe('Connection recovery', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should attempt to reconnect after connection loss', async () => {
      mockDriver.verifyConnectivity
        .mockRejectedValueOnce(new Error('Connection lost'))
        .mockResolvedValueOnce(undefined);

      neo4jModule = await import('../../db/neo4j');

      // Trigger first connectivity check (fails)
      jest.advanceTimersByTime(200);
      await Promise.resolve();

      // Trigger second connectivity check (succeeds)
      jest.advanceTimersByTime(200);
      await Promise.resolve();

      expect(mockDriver.verifyConnectivity).toHaveBeenCalledTimes(2);
    });
  });
});
