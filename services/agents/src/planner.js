"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const bus_1 = require("./bus");
const plan_1 = require("../../tgo/src/plan");
(0, bus_1.consume)('planner', async (m) => {
    if (m.kind !== 'plan')
        return;
    const tasks = (0, plan_1.planPR)(m.payload.changed);
    // also attach CSAT pools & emit decompose
    await emit('decompose', { key: m.key, tasks });
});
