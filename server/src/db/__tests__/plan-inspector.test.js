"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const plan_inspector_js_1 = require("../plan-inspector.js");
(0, globals_1.describe)('plan-inspector', () => {
    (0, globals_1.it)('detects sequential scans', () => {
        const plan = {
            'Node Type': 'Seq Scan',
            'Relation Name': 'cases',
        };
        (0, globals_1.expect)((0, plan_inspector_js_1.collectSeqScans)(plan)).toEqual(['cases']);
    });
    (0, globals_1.it)('validates expected index usage', () => {
        const plan = {
            'Node Type': 'Index Scan',
            'Relation Name': 'cases',
            'Index Name': 'idx_cases_tenant_case',
            Plans: [
                {
                    'Node Type': 'Index Scan',
                    'Relation Name': 'audit_access_logs',
                    'Index Name': 'idx_audit_access_logs_tenant_case',
                },
            ],
        };
        (0, globals_1.expect)(() => (0, plan_inspector_js_1.assertIndexUsage)(plan, [
            { relation: 'cases', index: 'idx_cases_tenant_case' },
            {
                relation: 'audit_access_logs',
                index: 'idx_audit_access_logs_tenant_case',
            },
        ])).not.toThrow();
    });
    (0, globals_1.it)('fails when expected index is missing', () => {
        const plan = {
            'Node Type': 'Index Scan',
            'Relation Name': 'cases',
            'Index Name': 'idx_cases_tenant_case',
        };
        (0, globals_1.expect)(() => (0, plan_inspector_js_1.assertIndexUsage)(plan, [
            { relation: 'cases', index: 'idx_cases_tenant_case' },
            { relation: 'audit_access_logs', index: 'idx_audit_access_logs_tenant_case' },
        ])).toThrow('Index guardrail failure');
    });
});
