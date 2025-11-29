import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getRedisClient } from '../../../src/config/database.js';

// Define mocks
const mockPublish = jest.fn();
const mockSubscribe = jest.fn();
const mockOn = jest.fn();
const mockQuit = jest.fn();
const mockDuplicate = jest.fn(() => ({
  publish: mockPublish,
  subscribe: mockSubscribe,
  on: mockOn,
  quit: mockQuit,
}));

// Mock dependencies
jest.mock('../../../src/config/database.js', () => ({
  getRedisClient: jest.fn(() => ({
    duplicate: mockDuplicate,
  })),
}));

jest.mock('../../../src/utils/logger.js', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

import { GossipProtocol } from '../../../src/agents/swarm/GossipProtocol.js';
import { ConsensusEngine } from '../../../src/agents/swarm/ConsensusEngine.js';
import { SwarmIntelligenceService } from '../../../src/services/SwarmIntelligenceService.js';

describe('Swarm Intelligence Layer', () => {
  let gossip: GossipProtocol;
  let consensus: ConsensusEngine;

  let mockRedisClient: any;
  let mockPub: any;
  let mockSub: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    gossip = new GossipProtocol('test-node-1');
    consensus = new ConsensusEngine('test-node-1', gossip);
    consensus.setPeerCount(1); // Set low peer count for testing quorum
    await gossip.initialize();
    await consensus.initialize();
  });

  describe('GossipProtocol', () => {
    it('should subscribe to channels on initialization', () => {
      // In the factory, we return the SAME mockDuplicate function which returns an object.
      // So checking mockDuplicate calls works.
      expect(mockDuplicate).toHaveBeenCalledTimes(2);
      expect(mockSubscribe).toHaveBeenCalledWith('swarm:gossip', 'swarm:consensus');
    });

    it('should broadcast messages', async () => {
      await gossip.broadcast('swarm:gossip', { type: 'heartbeat', payload: {} } as any);
      expect(mockPublish).toHaveBeenCalledWith(
        'swarm:gossip',
        expect.stringContaining('"type":"heartbeat"')
      );
    });
  });

  describe('ConsensusEngine', () => {
    it('should propose an action and broadcast it with signature', async () => {
      const id = await consensus.propose('test-action', { foo: 'bar' });
      expect(id).toBeDefined();
      expect(mockPublish).toHaveBeenCalledWith(
        'swarm:consensus',
        expect.stringContaining('"type":"proposal"')
      );
      // Verify signature presence
      expect(mockPublish).toHaveBeenCalledWith(
        'swarm:consensus',
        expect.stringContaining('"signature":')
      );
    });
  });

  describe('SwarmIntelligenceService', () => {
      it('should return a singleton instance', () => {
          const instance1 = SwarmIntelligenceService.getInstance();
          const instance2 = SwarmIntelligenceService.getInstance();
          expect(instance1).toBe(instance2);
      });
  });
});
