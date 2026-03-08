"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const PolicyCompiler_js_1 = require("../PolicyCompiler.js");
const EnforcementService_js_1 = require("../EnforcementService.js");
const SimulationService_js_1 = require("../SimulationService.js");
const types_js_1 = require("../types.js");
(0, globals_1.describe)('PolicyCompiler & Enforcement', () => {
    const compiler = PolicyCompiler_js_1.PolicyCompiler.getInstance();
    const enforcement = EnforcementService_js_1.EnforcementService.getInstance();
    const testPolicy = {
        version: '1.0.0',
        tenantId: 'tenant-123',
        defaultSensitivity: types_js_1.SensitivityClass.INTERNAL,
        authorityRequiredFor: [
            {
                action: 'query:sensitive-graph',
                sensitivity: types_js_1.SensitivityClass.HIGHLY_SENSITIVE,
                authorityType: 'WARRANT'
            },
            // Duplicate action to test merging
            {
                action: 'query:sensitive-graph',
                sensitivity: types_js_1.SensitivityClass.HIGHLY_SENSITIVE,
                authorityType: 'CONSENT'
            }
        ],
        licenseConstraints: [
            {
                source: 'twitter',
                allowedActions: ['read'],
                forbiddenActions: ['export'],
                attributionRequired: true
            }
        ],
        purposeTags: [
            {
                tag: 'marketing',
                allowedUses: ['query:public', 'export:report'], // Does NOT allow query:sensitive-graph
                requiresApproval: false
            }
        ],
        retentionRules: [
            {
                dataType: 'log:audit',
                retentionDays: 365,
                sensitivity: types_js_1.SensitivityClass.HIGHLY_SENSITIVE
            }
        ]
    };
    (0, globals_1.it)('should compile a policy deterministically', () => {
        const plan1 = compiler.compile(testPolicy);
        const plan2 = compiler.compile(testPolicy);
        (0, globals_1.expect)(plan1.planHash).toBe(plan2.planHash);
        (0, globals_1.expect)(plan1.queryRules['query:sensitive-graph']).toBeDefined();
        // Verify merging: should have 2 conditions
        (0, globals_1.expect)(plan1.queryRules['query:sensitive-graph'].conditions).toHaveLength(2);
    });
    (0, globals_1.it)('should enforce authority requirements (merged)', () => {
        enforcement.loadPolicy(testPolicy);
        const context = {
            user: { id: 'u1', roles: ['analyst'], clearanceLevel: 5 },
            action: { type: 'query', target: 'query:sensitive-graph' },
            activeAuthority: ['WARRANT']
        };
        // Needs BOTH Warrant AND Consent because we merged them?
        // Implementation of merge appends conditions. Logic checks ALL conditions.
        // So yes, it requires BOTH.
        let result = enforcement.evaluateQuery(context);
        (0, globals_1.expect)(result.allowed).toBe(false); // Missing CONSENT
        (0, globals_1.expect)(result.reason?.code).toBe('MISSING_AUTHORITY');
        context.activeAuthority = ['WARRANT', 'CONSENT'];
        result = enforcement.evaluateQuery(context);
        (0, globals_1.expect)(result.allowed).toBe(true);
    });
    (0, globals_1.it)('should enforce license export restrictions', () => {
        enforcement.loadPolicy(testPolicy);
        const context = {
            user: { id: 'u1', roles: ['analyst'], clearanceLevel: 5 },
            action: { type: 'export', target: 'source:twitter' },
        };
        const result = enforcement.evaluateExport(context);
        (0, globals_1.expect)(result.allowed).toBe(false);
        (0, globals_1.expect)(result.reason?.code).toBe('LICENSE_RESTRICTION');
    });
    (0, globals_1.it)('should enforce purpose constraints', () => {
        enforcement.loadPolicy(testPolicy);
        const context = {
            user: { id: 'u1', roles: ['analyst'], clearanceLevel: 5 },
            action: { type: 'query', target: 'query:sensitive-graph' },
            activeAuthority: ['WARRANT', 'CONSENT'],
            purpose: 'marketing'
        };
        // 'marketing' allowedUses does not include 'query:sensitive-graph'
        const result = enforcement.evaluateQuery(context);
        (0, globals_1.expect)(result.allowed).toBe(false);
        (0, globals_1.expect)(result.reason?.code).toBe('PURPOSE_MISMATCH');
        // Change action to allowed one
        context.action.target = 'query:public';
        // query:public has no authority requirements, so it falls through to ALLOW
        // Purpose check passes.
        const result2 = enforcement.evaluateQuery(context);
        (0, globals_1.expect)(result2.allowed).toBe(true);
    });
    (0, globals_1.it)('should generate retention filters', () => {
        enforcement.loadPolicy(testPolicy);
        const context = {
            user: { id: 'u1', roles: ['analyst'], clearanceLevel: 5 },
            action: { type: 'query', target: 'log:audit' },
        };
        const result = enforcement.evaluateQuery(context);
        (0, globals_1.expect)(result.allowed).toBe(true);
        (0, globals_1.expect)(result.modifications?.filterClauses).toContain('age_in_days <= 365');
    });
    (0, globals_1.it)('should simulate policy against historical events', async () => {
        const simulation = new SimulationService_js_1.SimulationService();
        const historicalEvents = [
            {
                id: 'evt-1',
                context: {
                    user: { id: 'u1', roles: ['analyst'], clearanceLevel: 5 },
                    action: { type: 'query', target: 'query:sensitive-graph' },
                    activeAuthority: []
                },
                originalOutcome: true // Was allowed in the past
            },
            {
                id: 'evt-2',
                context: {
                    user: { id: 'u1', roles: ['analyst'], clearanceLevel: 5 },
                    action: { type: 'export', target: 'source:twitter' },
                },
                originalOutcome: true // Was allowed in the past
            }
        ];
        const report = await simulation.simulate(testPolicy, historicalEvents);
        (0, globals_1.expect)(report.totalEvents).toBe(2);
        (0, globals_1.expect)(report.allowed).toBe(0);
        (0, globals_1.expect)(report.denied).toBe(2);
    });
});
