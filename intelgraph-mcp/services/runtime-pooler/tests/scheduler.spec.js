"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const scheduler_1 = require("../src/scheduler");
(0, vitest_1.describe)('Scheduler', () => {
    (0, vitest_1.it)('allocates and invokes', async () => {
        const s = new scheduler_1.Scheduler();
        const sess = await s.allocate('github');
        const out = await s.invoke(sess.id, 'ping', { x: 1 });
        (0, vitest_1.expect)(out.ok).toBe(true);
        await s.release(sess.id);
    });
});
