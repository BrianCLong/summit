"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const selector_js_1 = require("../selector.js");
globals_1.jest.mock('../pools', () => ({
    listPools: globals_1.jest.fn(),
    currentPricing: globals_1.jest.fn(),
    listCapacityReservations: globals_1.jest.fn(),
    pickCheapestEligible: globals_1.jest.fn(),
}));
const { listPools, currentPricing, listCapacityReservations, pickCheapestEligible, } = globals_1.jest.requireMock('../pools');
(0, globals_1.describe)('choosePool', () => {
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.resetAllMocks();
    });
    test('returns pickCheapestEligible result', async () => {
        const pools = [{ id: 'p1', region: 'us-east', labels: [], capacity: 1 }];
        const pricing = {
            p1: { pool_id: 'p1', cpu_sec_usd: 1, gb_sec_usd: 1, egress_gb_usd: 1 },
        };
        const expected = { id: 'p1' };
        listPools.mockResolvedValue(pools);
        currentPricing.mockResolvedValue(pricing);
        pickCheapestEligible.mockReturnValue(expected);
        const result = await (0, selector_js_1.choosePool)({ cpuSec: 5 }, 'us-east', 'tenant-a');
        (0, globals_1.expect)(result).toBe(expected);
        (0, globals_1.expect)(listPools).toHaveBeenCalled();
        (0, globals_1.expect)(currentPricing).toHaveBeenCalled();
        (0, globals_1.expect)(pickCheapestEligible).toHaveBeenCalledWith(pools, pricing, { cpuSec: 5 }, 'us-east');
    });
    test('returns null when no eligible pool', async () => {
        listPools.mockResolvedValue([
            { id: 'p1', region: 'us-east', labels: [], capacity: 1 },
        ]);
        currentPricing.mockResolvedValue({});
        pickCheapestEligible.mockReturnValue(null);
        const result = await (0, selector_js_1.choosePool)({});
        (0, globals_1.expect)(result).toBeNull();
        (0, globals_1.expect)(listCapacityReservations).not.toHaveBeenCalled();
    });
});
