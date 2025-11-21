/**
 * Tests for DataPoolManager
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { DataPoolManager } from '../data-pool-manager.js';

describe('DataPoolManager', () => {
  let manager: DataPoolManager;

  beforeEach(() => {
    manager = new DataPoolManager();
  });

  describe('addContribution', () => {
    it('should add a contribution and return merkle proof', async () => {
      const contribution = {
        poolId: 'pool-1',
        contributorId: 'user-1',
        data: { records: [{ id: 1, value: 'test' }] },
        metadata: {
          contentHash: 'abc123',
          size: 1024,
          mimeType: 'application/json',
        },
        signature: 'sig-1',
      };

      const result = await manager.addContribution(contribution);

      expect(result.contributionId).toBeDefined();
      expect(result.contentAddress).toBeDefined();
      expect(result.merkleProof).toBeInstanceOf(Array);
    });
  });

  describe('requestAccess', () => {
    it('should grant access and return token', async () => {
      const request = {
        poolId: 'pool-1',
        requesterId: 'user-2',
        purpose: 'Research analysis',
        attestations: [],
        signature: 'sig-2',
      };

      const result = await manager.requestAccess(request);

      expect(result.granted).toBe(true);
      expect(result.accessToken).toBeDefined();
      expect(result.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token', async () => {
      const request = {
        poolId: 'pool-1',
        requesterId: 'user-3',
        purpose: 'Testing',
        attestations: [],
        signature: 'sig-3',
      };

      const accessResult = await manager.requestAccess(request);
      const isValid = await manager.verifyAccessToken('pool-1', accessResult.accessToken!);

      expect(isValid).toBe(true);
    });

    it('should reject invalid token', async () => {
      const isValid = await manager.verifyAccessToken('pool-1', 'invalid-token');
      expect(isValid).toBe(false);
    });
  });

  describe('getPoolStats', () => {
    it('should return pool statistics', async () => {
      await manager.addContribution({
        poolId: 'stats-pool',
        contributorId: 'user-a',
        data: { test: 1 },
        metadata: { contentHash: 'hash1', size: 100 },
        signature: 'sig',
      });

      await manager.addContribution({
        poolId: 'stats-pool',
        contributorId: 'user-b',
        data: { test: 2 },
        metadata: { contentHash: 'hash2', size: 200 },
        signature: 'sig',
      });

      const stats = await manager.getPoolStats('stats-pool');

      expect(stats.totalContributions).toBe(2);
      expect(stats.totalContributors).toBe(2);
      expect(stats.totalSize).toBe(300);
    });
  });
});
