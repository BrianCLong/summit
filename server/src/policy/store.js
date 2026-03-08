"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.policyStore = exports.PolicyStore = exports.SEED_POLICIES = void 0;
const types_js_1 = require("./types.js");
// Seed Fixtures
exports.SEED_POLICIES = [
    {
        id: 'Warrant-X-123',
        name: 'Warrant X-123',
        type: types_js_1.PolicyType.AUTHORITY,
        jurisdiction: 'US-SDNY',
        issuer: 'Federal Court',
        clauses: [{ id: 'C1', text: 'Authorized for search of financial records' }],
        selectors: [
            { type: 'entity', value: 'Person', allow: true },
            { type: 'entity', value: 'BankAccount', allow: true }
        ],
        retention: 'P90D', // 90 days
        effectiveFrom: new Date('2023-01-01'),
        effectiveTo: new Date('2025-01-01')
    },
    {
        id: 'OFAC-Sanctions-List',
        name: 'OFAC Sanctions List',
        type: types_js_1.PolicyType.AUTHORITY,
        jurisdiction: 'International',
        issuer: 'US Treasury',
        clauses: [{ id: 'C2', text: 'Prohibited from transacting' }],
        selectors: [
            { type: 'source', value: 'darkweb', allow: false }
        ],
        retention: 'forever',
        effectiveFrom: new Date('2020-01-01')
    },
    {
        id: 'Internal-Research-DP-2025',
        name: 'Internal Research DP 2025',
        type: types_js_1.PolicyType.LICENSE,
        jurisdiction: 'Internal',
        licensor: 'Legal Dept',
        grants: ['read', 'aggregate'], // No export
        revocations: ['export'],
        clauses: [{ id: 'C3', text: 'Internal use only' }],
        selectors: [],
        retention: 'P365D',
        effectiveFrom: new Date('2025-01-01')
    }
];
// Simple In-Memory Store for Prototype
class PolicyStore {
    policies = new Map();
    bindings = [];
    constructor() {
        this.seed();
    }
    seed() {
        for (const p of exports.SEED_POLICIES) {
            this.policies.set(p.id, p);
        }
    }
    getPolicy(id) {
        return this.policies.get(id);
    }
    getAllPolicies() {
        return Array.from(this.policies.values());
    }
    getActivePoliciesForTarget(targetId) {
        // For MVP, we return all applicable policies. In real world, we'd check bindings.
        // Simulating bindings based on targetId prefix or strict mapping
        if (targetId === 'case-research') {
            // Internal Research only
            return [this.policies.get('Internal-Research-DP-2025')];
        }
        // Default: Return all authorities (Warrants etc)
        return [this.policies.get('Warrant-X-123'), this.policies.get('OFAC-Sanctions-List')];
    }
}
exports.PolicyStore = PolicyStore;
exports.policyStore = new PolicyStore();
