import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { PricingService, PLANS } from '../PricingService';
import { Quote } from '../types';

describe('PricingService', () => {
  let service: PricingService;

  beforeEach(() => {
    service = PricingService.getInstance();
    service._resetForTesting();
  });

  it('should retrieve standard plans', () => {
    const plan = service.getPlan('business-v1');
    expect(plan).toBeDefined();
    expect(plan?.name).toBe('Business');
  });

  it('should validate a valid quote', () => {
    const quote: Quote = {
      id: 'q1',
      items: [{ type: 'plan', code: 'business-v1', quantity: 1, unitPrice: 2000 }],
      currency: 'USD',
      totalBeforeDiscount: 2000,
      totalAfterDiscount: 2000,
      status: 'draft'
    };
    const errors = service.validateQuote(quote);
    expect(errors).toHaveLength(0);
  });

  it('should flag excessive discounts', () => {
     const quote: Quote = {
      id: 'q2',
      items: [{ type: 'plan', code: 'enterprise-v1', quantity: 1, unitPrice: 100000 }],
      currency: 'USD',
      totalBeforeDiscount: 100000,
      totalAfterDiscount: 60000, // 40% discount
      status: 'draft'
    };
    const errors = service.validateQuote(quote);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('exceeds automatic approval limit');
  });

  it('should flag floor price violations', () => {
      const quote: Quote = {
      id: 'q3',
      items: [{ type: 'plan', code: 'enterprise-v1', quantity: 1, unitPrice: 100000 }],
      currency: 'USD',
      totalBeforeDiscount: 100000,
      totalAfterDiscount: 40000, // Below 50k floor
      status: 'draft'
    };
    const errors = service.validateQuote(quote);
    // Should have both discount error and floor price error
    expect(errors.some(e => e.includes('floor price'))).toBe(true);
  });
});
