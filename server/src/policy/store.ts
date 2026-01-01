
import { Authority, License, Purpose, PolicyType, PolicyBinding } from './types.js';

// Seed Fixtures
export const SEED_POLICIES: (Authority | License | Purpose)[] = [
  {
    id: 'Warrant-X-123',
    name: 'Warrant X-123',
    type: PolicyType.AUTHORITY,
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
  } as Authority,
  {
    id: 'OFAC-Sanctions-List',
    name: 'OFAC Sanctions List',
    type: PolicyType.AUTHORITY,
    jurisdiction: 'International',
    issuer: 'US Treasury',
    clauses: [{ id: 'C2', text: 'Prohibited from transacting' }],
    selectors: [
        { type: 'source', value: 'darkweb', allow: false }
    ],
    retention: 'forever',
    effectiveFrom: new Date('2020-01-01')
  } as Authority,
  {
    id: 'Internal-Research-DP-2025',
    name: 'Internal Research DP 2025',
    type: PolicyType.LICENSE,
    jurisdiction: 'Internal',
    licensor: 'Legal Dept',
    grants: ['read', 'aggregate'], // No export
    revocations: ['export'],
    clauses: [{ id: 'C3', text: 'Internal use only' }],
    selectors: [],
    retention: 'P365D',
    effectiveFrom: new Date('2025-01-01')
  } as License
];

// Simple In-Memory Store for Prototype
export class PolicyStore {
  private policies: Map<string, Authority | License | Purpose> = new Map();
  private bindings: PolicyBinding[] = [];

  constructor() {
    this.seed();
  }

  private seed() {
    for (const p of SEED_POLICIES) {
      this.policies.set(p.id, p);
    }
  }

  public getPolicy(id: string) {
    return this.policies.get(id);
  }

  public getAllPolicies() {
    return Array.from(this.policies.values());
  }

  public getActivePoliciesForTarget(targetId: string): (Authority | License | Purpose)[] {
    // For MVP, we return all applicable policies. In real world, we'd check bindings.
    // Simulating bindings based on targetId prefix or strict mapping
    if (targetId === 'case-research') {
        // Internal Research only
        return [this.policies.get('Internal-Research-DP-2025')!];
    }
    // Default: Return all authorities (Warrants etc)
    return [this.policies.get('Warrant-X-123')!, this.policies.get('OFAC-Sanctions-List')!];
  }
}

export const policyStore = new PolicyStore();
