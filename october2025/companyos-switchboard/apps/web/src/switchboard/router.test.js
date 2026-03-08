"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const router_1 = require("./router");
const zod_1 = require("zod");
(0, vitest_1.describe)('SwitchboardRouter', () => {
    (0, vitest_1.it)('should dispatch a registered route successfully', async () => {
        const router = new router_1.SwitchboardRouter();
        const handler = vitest_1.vi.fn().mockResolvedValue({ success: true });
        const route = (0, router_1.defineRoute)({
            id: 'test.route',
            description: 'Test Route',
            source: 'client',
            targetService: 'other',
            inputSchema: zod_1.z.object({ val: zod_1.z.number() }),
            outputSchema: zod_1.z.object({ success: zod_1.z.boolean() }),
            handler,
        });
        router.register(route);
        const context = { requestId: '1', source: 'client' };
        const result = await router.dispatch('test.route', { val: 123 }, context);
        (0, vitest_1.expect)(result).toEqual({ success: true });
        (0, vitest_1.expect)(handler).toHaveBeenCalledWith({ val: 123 }, context);
    });
    (0, vitest_1.it)('should fail on invalid input', async () => {
        const router = new router_1.SwitchboardRouter();
        const route = (0, router_1.defineRoute)({
            id: 'test.route',
            description: 'Test Route',
            source: 'client',
            targetService: 'other',
            inputSchema: zod_1.z.object({ val: zod_1.z.number() }),
            outputSchema: zod_1.z.any(),
            handler: async () => ({}),
        });
        router.register(route);
        const context = { requestId: '1', source: 'client' };
        await (0, vitest_1.expect)(router.dispatch('test.route', { val: 'not-a-number' }, context))
            .rejects.toThrow('Invalid input');
    });
    (0, vitest_1.it)('should retry on failure', async () => {
        const router = new router_1.SwitchboardRouter({ defaultRetries: 2 });
        const handler = vitest_1.vi.fn()
            .mockRejectedValueOnce(new Error('Fail 1'))
            .mockRejectedValueOnce(new Error('Fail 2'))
            .mockResolvedValue({ success: true });
        const route = (0, router_1.defineRoute)({
            id: 'test.retry',
            description: 'Retry Route',
            source: 'client',
            targetService: 'other',
            inputSchema: zod_1.z.any(),
            outputSchema: zod_1.z.any(),
            handler,
        });
        router.register(route);
        const context = { requestId: '1', source: 'client' };
        const result = await router.dispatch('test.retry', {}, context);
        (0, vitest_1.expect)(result).toEqual({ success: true });
        (0, vitest_1.expect)(handler).toHaveBeenCalledTimes(3);
    });
    (0, vitest_1.it)('should timeout if handler takes too long', async () => {
        const router = new router_1.SwitchboardRouter({ defaultTimeout: 50 });
        const handler = vitest_1.vi.fn().mockImplementation(async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            return { success: true };
        });
        const route = (0, router_1.defineRoute)({
            id: 'test.timeout',
            description: 'Timeout Route',
            source: 'client',
            targetService: 'other',
            inputSchema: zod_1.z.any(),
            outputSchema: zod_1.z.any(),
            handler,
        });
        router.register(route);
        const context = { requestId: '1', source: 'client' };
        await (0, vitest_1.expect)(router.dispatch('test.timeout', {}, context))
            .rejects.toThrow('timed out');
    }, 1000); // Increase test timeout for this specific test
});
