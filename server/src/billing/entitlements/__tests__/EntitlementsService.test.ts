import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { EntitlementsService } from '../EntitlementsService.js';

describe('EntitlementsService', () => {
  let service: EntitlementsService;

  beforeEach(() => {
    service = EntitlementsService.getInstance();
  });

  describe('canUse', () => {
    it('should return true by default for any feature', async () => {
      const result = await service.canUse('any_feature', 'tenant_123');
      expect(result).toBe(true);
    });
  });

  describe('quotaRemaining', () => {
    it('should return Infinity by default for any feature', async () => {
      const result = await service.quotaRemaining('any_feature', 'tenant_123');
      expect(result).toBe(Infinity);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = EntitlementsService.getInstance();
      const instance2 = EntitlementsService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });
});
