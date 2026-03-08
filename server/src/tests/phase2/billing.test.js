"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const engine_js_1 = require("../../platform/maas/billing/engine.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('Billing Engine', () => {
    const plan = {
        id: 'pro-plan',
        name: 'Pro',
        currency: 'USD',
        perUnitRates: {
            'TASKS': 0.10,
            'LLM_TOKENS': 0.001,
            'STORAGE_NODES': 0.0,
            'EVENTS': 0.0
        },
        includedQuotas: {
            'TASKS': 10,
            'LLM_TOKENS': 0,
            'STORAGE_NODES': 0,
            'EVENTS': 0
        }
    };
    (0, globals_1.test)('should generate invoice with quota deduction', () => {
        const usage = [
            {
                id: 'u1',
                tenantId: 't1',
                category: 'TASKS',
                quantity: 15,
                timestamp: new Date(),
                unit: 'count',
                source: 'test'
            }
        ];
        const plans = new Map([['pro-plan', plan]]);
        const engine = new engine_js_1.BillingEngine(usage, plans);
        const invoice = engine.generateInvoice('t1', 'pro-plan', new Date(0), new Date());
        // 15 tasks - 10 quota = 5 billable
        // 5 * 0.10 = 0.50
        (0, globals_1.expect)(invoice.total).toBe(0.50);
        (0, globals_1.expect)(invoice.lineItems[0].quantity).toBe(15);
    });
});
