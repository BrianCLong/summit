"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const plan_1 = require("../src/plan");
test('bubbles dependents', () => {
    const p = (0, plan_1.planRelease)(['services/conductor']);
    expect(p.queue.includes('client')).toBeDefined();
});
