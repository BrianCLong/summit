/**
 * Tests for ListingManager
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ListingManager } from '../listing-manager.js';

describe('ListingManager', () => {
  let manager: ListingManager;

  beforeEach(() => {
    manager = new ListingManager();
  });

  describe('createListing', () => {
    it('should create a listing and return listingId', async () => {
      const listing = {
        poolId: 'pool-1',
        sellerId: 'seller-1',
        price: { amount: 100, currency: 'USD', model: 'one_time' as const },
        terms: { usageRights: ['read', 'analyze'], attribution: true },
        metadata: {
          title: 'Test Dataset',
          description: 'A test dataset for unit testing',
          tags: ['test', 'sample'],
          sampleAvailable: true,
        },
      };

      const result = await manager.createListing(listing);

      expect(result.listingId).toBeDefined();
      expect(typeof result.listingId).toBe('string');
    });
  });

  describe('getListing', () => {
    it('should retrieve a listing and increment views', async () => {
      const listing = {
        poolId: 'pool-2',
        sellerId: 'seller-2',
        price: { amount: 50, currency: 'USD', model: 'per_query' as const },
        terms: { usageRights: ['read'], attribution: false },
        metadata: {
          title: 'Query Dataset',
          description: 'Pay per query',
          tags: ['api'],
          sampleAvailable: false,
        },
      };

      const { listingId } = await manager.createListing(listing);
      const retrieved = await manager.getListing(listingId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.metadata.title).toBe('Query Dataset');
      expect(retrieved?.views).toBe(1);
    });
  });

  describe('searchListings', () => {
    it('should search listings by query', async () => {
      await manager.createListing({
        poolId: 'p1',
        sellerId: 's1',
        price: { amount: 100, currency: 'USD', model: 'one_time' as const },
        terms: { usageRights: ['read'], attribution: true },
        metadata: {
          title: 'Financial Data',
          description: 'Stock market data',
          tags: ['finance'],
          sampleAvailable: true,
        },
      });

      await manager.createListing({
        poolId: 'p2',
        sellerId: 's2',
        price: { amount: 200, currency: 'USD', model: 'subscription' as const },
        terms: { usageRights: ['read', 'analyze'], attribution: true },
        metadata: {
          title: 'Weather Data',
          description: 'Climate information',
          tags: ['weather'],
          sampleAvailable: true,
        },
      });

      const results = await manager.searchListings({ query: 'financial' });
      expect(results).toHaveLength(1);
      expect(results[0].metadata.title).toBe('Financial Data');
    });

    it('should filter by price range', async () => {
      await manager.createListing({
        poolId: 'p3',
        sellerId: 's3',
        price: { amount: 50, currency: 'USD', model: 'one_time' as const },
        terms: { usageRights: ['read'], attribution: true },
        metadata: { title: 'Cheap', description: 'Low cost', tags: [], sampleAvailable: true },
      });

      await manager.createListing({
        poolId: 'p4',
        sellerId: 's4',
        price: { amount: 500, currency: 'USD', model: 'one_time' as const },
        terms: { usageRights: ['read'], attribution: true },
        metadata: { title: 'Premium', description: 'High value', tags: [], sampleAvailable: true },
      });

      const results = await manager.searchListings({ maxPrice: 100 });
      expect(results).toHaveLength(1);
      expect(results[0].metadata.title).toBe('Cheap');
    });
  });

  describe('recordPurchase', () => {
    it('should increment purchase count', async () => {
      const { listingId } = await manager.createListing({
        poolId: 'p5',
        sellerId: 's5',
        price: { amount: 75, currency: 'USD', model: 'one_time' as const },
        terms: { usageRights: ['read'], attribution: true },
        metadata: { title: 'Popular', description: 'Best seller', tags: [], sampleAvailable: true },
      });

      await manager.recordPurchase(listingId);
      await manager.recordPurchase(listingId);

      const listing = await manager.getListing(listingId);
      expect(listing?.purchases).toBe(2);
    });
  });
});
