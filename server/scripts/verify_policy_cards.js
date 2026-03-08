"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const policy_engine_js_1 = require("../src/autonomous/policy-engine.js");
const mockDb = { query: async () => ({ rows: [] }) };
const mockLogger = {
    info: (obj, msg) => console.log('INFO:', msg, obj),
    error: (obj, msg) => console.error('ERROR:', msg, obj),
    warn: (obj, msg) => console.warn('WARN:', msg, obj),
    debug: () => { }
};
async function verify() {
    console.log('Verifying Policy Engine Cards...');
    console.log('CWD:', process.cwd());
    const engine = new policy_engine_js_1.PolicyEngine('http://mock-opa', mockDb, mockLogger);
    // Test Case 1: High Autonomy + Critical Resource -> Should be DENIED by card
    const context = {
        user: { id: 'u1', roles: [], tenantId: 't1', permissions: [] },
        resource: { type: 'db', id: 'production-db', tenantId: 't1', sensitivity: 'critical' },
        action: { type: 'delete', category: 'write', autonomy: 4 }, // Autonomy > 3
        environment: { name: 'prod', production: true, region: 'us-east' },
        time: { timestamp: Date.now(), timezone: 'UTC', businessHours: true }
    };
    const decision = await engine.evaluate('u1', 'delete', 'production:db', {
        autonomy: 4,
        budgets: { usd: 1, tokens: 1, timeMinutes: 1 }
    });
    if (decision.allowed === false && decision.reason.includes('no-high-risk-autonomy')) {
        console.log('✅ Policy Card Enforcement Verified: High Autonomy action blocked.');
        process.exit(0);
    }
    else {
        console.error('❌ Policy Card Enforcement Failed:', decision);
        process.exit(1);
    }
}
verify().catch(e => {
    console.error(e);
    process.exit(1);
});
