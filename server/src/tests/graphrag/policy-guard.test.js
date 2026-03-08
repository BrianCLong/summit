"use strict";
/**
 * GraphRAG Policy Guard Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const policy_guard_js_1 = require("../../services/graphrag/policy-guard.js");
(0, globals_1.describe)('GraphRAG Policy Guard', () => {
    (0, globals_1.describe)('DefaultPolicyEngine', () => {
        let policyEngine;
        (0, globals_1.beforeEach)(() => {
            policyEngine = new policy_guard_js_1.DefaultPolicyEngine();
        });
        (0, globals_1.it)('should allow access when user has sufficient clearance', () => {
            const user = {
                userId: 'user-1',
                roles: [],
                clearances: ['SECRET'],
            };
            const decision = policyEngine.canViewEvidence({
                user,
                evidenceId: 'ev-1',
                metadata: { classification: 'CONFIDENTIAL' },
            });
            (0, globals_1.expect)(decision.allow).toBe(true);
        });
        (0, globals_1.it)('should deny access when user lacks clearance', () => {
            const user = {
                userId: 'user-1',
                roles: [],
                clearances: ['CONFIDENTIAL'],
            };
            const decision = policyEngine.canViewEvidence({
                user,
                evidenceId: 'ev-1',
                metadata: { classification: 'SECRET' },
            });
            (0, globals_1.expect)(decision.allow).toBe(false);
            (0, globals_1.expect)(decision.reason).toContain('Insufficient clearance');
        });
        (0, globals_1.it)('should deny access when missing need-to-know tag', () => {
            const user = {
                userId: 'user-1',
                roles: [],
                clearances: ['TS'],
                needToKnowTags: ['PROJECT_A'],
            };
            const decision = policyEngine.canViewEvidence({
                user,
                evidenceId: 'ev-1',
                metadata: { needToKnowTags: ['PROJECT_B', 'PROJECT_C'] },
            });
            (0, globals_1.expect)(decision.allow).toBe(false);
            (0, globals_1.expect)(decision.reason).toContain('need-to-know');
        });
        (0, globals_1.it)('should allow access when user has matching need-to-know tag', () => {
            const user = {
                userId: 'user-1',
                roles: [],
                clearances: ['SECRET'],
                needToKnowTags: ['PROJECT_A', 'PROJECT_B'],
            };
            const decision = policyEngine.canViewEvidence({
                user,
                evidenceId: 'ev-1',
                metadata: { needToKnowTags: ['PROJECT_B'] },
            });
            (0, globals_1.expect)(decision.allow).toBe(true);
        });
        (0, globals_1.it)('should deny access when license does not allow analytics', () => {
            const user = {
                userId: 'user-1',
                roles: [],
                clearances: ['SECRET'],
            };
            const decision = policyEngine.canViewEvidence({
                user,
                evidenceId: 'ev-1',
                metadata: { licenseType: 'EXPORT_ONLY' },
            });
            (0, globals_1.expect)(decision.allow).toBe(false);
            (0, globals_1.expect)(decision.reason).toContain('License type');
        });
        (0, globals_1.it)('should allow access when license allows analytics', () => {
            const user = {
                userId: 'user-1',
                roles: [],
                clearances: [],
            };
            const decision = policyEngine.canViewEvidence({
                user,
                evidenceId: 'ev-1',
                metadata: { licenseType: 'ANALYZE' },
            });
            (0, globals_1.expect)(decision.allow).toBe(true);
        });
        (0, globals_1.it)('should enforce tenant isolation', () => {
            const user = {
                userId: 'user-1',
                roles: [],
                clearances: [],
                tenantId: 'tenant-A',
            };
            const decision = policyEngine.canViewEvidence({
                user,
                evidenceId: 'ev-1',
                metadata: { tenantId: 'tenant-B' },
            });
            (0, globals_1.expect)(decision.allow).toBe(false);
            (0, globals_1.expect)(decision.reason).toContain('different tenant');
        });
    });
    (0, globals_1.describe)('filterEvidenceByPolicy', () => {
        (0, globals_1.it)('should filter out evidence user cannot view', () => {
            const policyEngine = new policy_guard_js_1.MockPolicyEngine();
            policyEngine.denyEvidence('ev-2');
            const user = {
                userId: 'user-1',
                roles: [],
                clearances: [],
            };
            const evidence = [
                { evidenceId: 'ev-1', snippet: 'Evidence 1', score: 0.9 },
                { evidenceId: 'ev-2', snippet: 'Evidence 2', score: 0.8 },
                { evidenceId: 'ev-3', snippet: 'Evidence 3', score: 0.7 },
            ];
            const { allowed, filtered, filterReasons } = (0, policy_guard_js_1.filterEvidenceByPolicy)(evidence, user, policyEngine);
            (0, globals_1.expect)(allowed.length).toBe(2);
            (0, globals_1.expect)(filtered.length).toBe(1);
            (0, globals_1.expect)(filtered[0].evidenceId).toBe('ev-2');
            (0, globals_1.expect)(filterReasons.has('ev-2')).toBe(true);
        });
        (0, globals_1.it)('should allow all evidence when policy allows', () => {
            const policyEngine = new policy_guard_js_1.MockPolicyEngine();
            policyEngine.setAllowAll(true);
            const user = {
                userId: 'user-1',
                roles: [],
                clearances: [],
            };
            const evidence = [
                { evidenceId: 'ev-1', snippet: 'Evidence 1', score: 0.9 },
                { evidenceId: 'ev-2', snippet: 'Evidence 2', score: 0.8 },
            ];
            const { allowed, filtered } = (0, policy_guard_js_1.filterEvidenceByPolicy)(evidence, user, policyEngine);
            (0, globals_1.expect)(allowed.length).toBe(2);
            (0, globals_1.expect)(filtered.length).toBe(0);
        });
        (0, globals_1.it)('should filter all evidence when policy denies all', () => {
            const policyEngine = new policy_guard_js_1.MockPolicyEngine();
            policyEngine.setAllowAll(false);
            const user = {
                userId: 'user-1',
                roles: [],
                clearances: [],
            };
            const evidence = [
                { evidenceId: 'ev-1', snippet: 'Evidence 1', score: 0.9 },
                { evidenceId: 'ev-2', snippet: 'Evidence 2', score: 0.8 },
            ];
            const { allowed, filtered } = (0, policy_guard_js_1.filterEvidenceByPolicy)(evidence, user, policyEngine);
            (0, globals_1.expect)(allowed.length).toBe(0);
            (0, globals_1.expect)(filtered.length).toBe(2);
        });
    });
    (0, globals_1.describe)('applyPolicyToContext', () => {
        (0, globals_1.it)('should filter evidence in context and preserve nodes/edges', () => {
            const policyEngine = new policy_guard_js_1.MockPolicyEngine();
            policyEngine.denyEvidence('ev-2');
            const user = {
                userId: 'user-1',
                roles: [],
                clearances: [],
            };
            const context = {
                nodes: [
                    { id: 'n1', type: 'Person', label: 'John' },
                    { id: 'n2', type: 'Person', label: 'Jane' },
                ],
                edges: [
                    { id: 'e1', type: 'KNOWS', fromId: 'n1', toId: 'n2' },
                ],
                evidenceSnippets: [
                    { evidenceId: 'ev-1', snippet: 'Evidence 1', score: 0.9 },
                    { evidenceId: 'ev-2', snippet: 'Evidence 2', score: 0.8 },
                ],
            };
            const { filteredContext, policyDecisions } = (0, policy_guard_js_1.applyPolicyToContext)(context, user, policyEngine);
            // Nodes and edges preserved
            (0, globals_1.expect)(filteredContext.nodes.length).toBe(2);
            (0, globals_1.expect)(filteredContext.edges.length).toBe(1);
            // Evidence filtered
            (0, globals_1.expect)(filteredContext.evidenceSnippets.length).toBe(1);
            (0, globals_1.expect)(filteredContext.evidenceSnippets[0].evidenceId).toBe('ev-1');
            // Policy decisions recorded
            (0, globals_1.expect)(policyDecisions.filteredEvidenceCount).toBe(1);
            (0, globals_1.expect)(policyDecisions.allowedEvidenceCount).toBe(1);
        });
    });
    (0, globals_1.describe)('canAccessCase', () => {
        (0, globals_1.it)('should return true when user is member of case', () => {
            const user = {
                userId: 'user-1',
                roles: [],
                clearances: [],
                cases: ['case-1', 'case-2', 'case-3'],
            };
            (0, globals_1.expect)((0, policy_guard_js_1.canAccessCase)(user, 'case-2')).toBe(true);
        });
        (0, globals_1.it)('should return false when user is not member of case', () => {
            const user = {
                userId: 'user-1',
                roles: [],
                clearances: [],
                cases: ['case-1', 'case-3'],
            };
            (0, globals_1.expect)((0, policy_guard_js_1.canAccessCase)(user, 'case-2')).toBe(false);
        });
        (0, globals_1.it)('should return true when no case membership tracking', () => {
            const user = {
                userId: 'user-1',
                roles: [],
                clearances: [],
                // No cases array
            };
            (0, globals_1.expect)((0, policy_guard_js_1.canAccessCase)(user, 'case-2')).toBe(true);
        });
    });
});
