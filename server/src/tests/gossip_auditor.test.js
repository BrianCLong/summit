"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GossipAuditor_js_1 = require("../transparency/GossipAuditor.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('GossipAuditor', () => {
    (0, globals_1.it)('alerts on fork', async () => {
        const alerts = [];
        const auditor = new GossipAuditor_js_1.GossipAuditor({
            getSTH: async () => ({ size: 1, root: 'a' }),
            getRange: async () => ['b'],
        }, { alert: (m) => alerts.push(m) });
        const res = await auditor.auditOnce();
        (0, globals_1.expect)(res.ok).toBe(false);
        (0, globals_1.expect)(alerts).toEqual(['transparency_log_mismatch']);
    });
});
