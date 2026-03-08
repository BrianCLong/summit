"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const pricing_refresh_js_1 = require("../pricing-refresh.js");
(0, globals_1.describe)('refreshPricing', () => {
    test('upserts valid pricing signals and skips unknown pools', async () => {
        const mockPool = {
            query: globals_1.jest.fn(),
        };
        const provider = {
            fetch: globals_1.jest.fn().mockResolvedValue({
                'pool-known': {
                    cpu_sec_usd: 0.01,
                    gb_sec_usd: 0.02,
                    egress_gb_usd: 0.03,
                },
                'pool-unknown': {
                    cpu_sec_usd: 0.05,
                    gb_sec_usd: 0.06,
                    egress_gb_usd: 0.07,
                },
                invalid: {
                    cpu_sec_usd: -1,
                    gb_sec_usd: 0.06,
                    egress_gb_usd: 0.07,
                },
            }),
        };
        mockPool.query
            .mockResolvedValueOnce({ rows: [{ id: 'pool-known' }] })
            .mockResolvedValueOnce({ rows: [] });
        const effectiveAt = new Date('2024-01-01T00:00:00.000Z');
        const result = await (0, pricing_refresh_js_1.refreshPricing)({
            pool: mockPool,
            provider,
            effectiveAt,
        });
        (0, globals_1.expect)(mockPool.query).toHaveBeenCalledTimes(2);
        (0, globals_1.expect)(mockPool.query.mock.calls[1][0]).toContain('INSERT INTO pool_pricing');
        (0, globals_1.expect)(mockPool.query.mock.calls[1][1]).toEqual([
            'pool-known',
            0.01,
            0.02,
            0.03,
            effectiveAt,
        ]);
        (0, globals_1.expect)(result.updatedPools).toBe(1);
        (0, globals_1.expect)(result.skippedPools).toBe(2);
        (0, globals_1.expect)(result.effectiveAt).toBe(effectiveAt);
    });
});
