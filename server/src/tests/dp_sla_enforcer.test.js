"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SlaEnforcer_js_1 = require("../privacy/dp/SlaEnforcer.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('SlaEnforcer', () => {
    (0, globals_1.it)('credits and pauses on breach', async () => {
        const actions = [];
        const enforcer = new SlaEnforcer_js_1.SlaEnforcer({
            orders: { credit: async (id) => actions.push(`credit:${id}`) },
            entitlements: {
                pause: async (id) => actions.push(`pause:${id}`),
            },
        });
        const res = await enforcer.check(5, 1, 'ent1', 'ord1');
        (0, globals_1.expect)(res.refunded).toBe(true);
        (0, globals_1.expect)(actions).toEqual(['credit:ord1', 'pause:ent1']);
    });
});
