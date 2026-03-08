"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const PricingService_js_1 = require("../PricingService.js");
(0, globals_1.describe)('PricingService', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        service = PricingService_js_1.PricingService.getInstance();
        service._resetForTesting();
    });
    (0, globals_1.it)('should retrieve standard plans', () => {
        const plan = service.getPlan('business-v1');
        (0, globals_1.expect)(plan).toBeDefined();
        (0, globals_1.expect)(plan?.name).toBe('Business');
    });
    (0, globals_1.it)('should validate a valid quote', () => {
        const quote = {
            id: 'q1',
            items: [{ type: 'plan', code: 'business-v1', quantity: 1, unitPrice: 2000 }],
            currency: 'USD',
            totalBeforeDiscount: 2000,
            totalAfterDiscount: 2000,
            status: 'draft'
        };
        const errors = service.validateQuote(quote);
        (0, globals_1.expect)(errors).toHaveLength(0);
    });
    (0, globals_1.it)('should flag excessive discounts', () => {
        const quote = {
            id: 'q2',
            items: [{ type: 'plan', code: 'enterprise-v1', quantity: 1, unitPrice: 100000 }],
            currency: 'USD',
            totalBeforeDiscount: 100000,
            totalAfterDiscount: 60000, // 40% discount
            status: 'draft'
        };
        const errors = service.validateQuote(quote);
        (0, globals_1.expect)(errors.length).toBeGreaterThan(0);
        (0, globals_1.expect)(errors[0]).toContain('exceeds automatic approval limit');
    });
    (0, globals_1.it)('should flag floor price violations', () => {
        const quote = {
            id: 'q3',
            items: [{ type: 'plan', code: 'enterprise-v1', quantity: 1, unitPrice: 100000 }],
            currency: 'USD',
            totalBeforeDiscount: 100000,
            totalAfterDiscount: 40000, // Below 50k floor
            status: 'draft'
        };
        const errors = service.validateQuote(quote);
        // Should have both discount error and floor price error
        (0, globals_1.expect)(errors.some(e => e.includes('floor price'))).toBe(true);
    });
});
