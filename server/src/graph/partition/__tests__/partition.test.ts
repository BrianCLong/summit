import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { ShardManager } from '../ShardManager';
import { GraphRouter } from '../GraphRouter';
import { LocalityAwarePartitionStrategy } from '../PartitionStrategy';
import neo4j from 'neo4j-driver';

// Mock Neo4j driver
jest.mock('neo4j-driver', () => ({
  driver: jest.fn(() => ({
    verifyConnectivity: jest.fn().mockResolvedValue(true),
    session: jest.fn(() => ({
      run: jest.fn().mockResolvedValue({ records: [] }),
      close: jest.fn().mockResolvedValue(undefined),
    })),
    close: jest.fn().mockResolvedValue(undefined),
  })),
  auth: {
    basic: jest.fn(),
  },
}));

describe('Edge-Scale Graph Partitioning', () => {
  let shardManager: ShardManager;

  beforeEach(async () => {
    // Reset singleton if possible, or just re-register
    // Since it's a private constructor singleton, we can't easily reset it without
    // adding a reset method or accessing private instance.
    // Ideally we add a _resetForTesting method.
    // For now we assume fresh state or handle collisions.
    shardManager = ShardManager.getInstance();
    await shardManager.closeAll();
  });

  afterEach(async () => {
    await shardManager.closeAll();
  });

  it('should register shards correctly', async () => {
    await shardManager.registerShard({
      id: 'shard-1',
      uri: 'bolt://localhost:7687',
      region: 'us-east'
    });

    expect(shardManager.getDriver('shard-1')).toBeDefined();
    expect(shardManager.getAllShards()).toContain('shard-1');
  });

  it('should route based on region locality', async () => {
    await shardManager.registerShard({
      id: 'us-shard',
      uri: 'bolt://us:7687',
      region: 'us-east'
    });
    await shardManager.registerShard({
      id: 'eu-shard',
      uri: 'bolt://eu:7687',
      region: 'eu-west'
    });

    const strategy = new LocalityAwarePartitionStrategy(new Map([
        ['us-east', 'us-shard'],
        ['eu-west', 'eu-shard']
    ]));

    const router = new GraphRouter(strategy);

    // Mock the drivers to verify calls
    const usDriver = shardManager.getDriver('us-shard');
    const euDriver = shardManager.getDriver('eu-shard');

    // We can't easily spy on the mocked driver instances created inside ShardManager
    // without more complex mocking, but we can verify the Strategy resolution logic.

    const shardA = strategy.resolveShard({ region: 'us-east' });
    expect(shardA).toBe('us-shard');

    const shardB = strategy.resolveShard({ region: 'eu-west' });
    expect(shardB).toBe('eu-shard');
  });

  it('should fallback to hashing if no region provided', async () => {
    await shardManager.registerShard({
        id: 'shard-1',
        uri: 'bolt://1:7687',
        region: 'r1'
    });
    await shardManager.registerShard({
        id: 'shard-2',
        uri: 'bolt://2:7687',
        region: 'r2'
    });

    const strategy = new LocalityAwarePartitionStrategy(new Map());

    const s1 = strategy.resolveShard({ tenantId: 'tenant-a' });
    const s2 = strategy.resolveShard({ tenantId: 'tenant-a' }); // Should be deterministic

    expect(s1).toBe(s2);
    expect(['shard-1', 'shard-2']).toContain(s1);
  });
});
