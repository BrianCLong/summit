
import { SensitivityClass } from '../pii/sensitivity.js';

export enum PolicyType {
  AUTHORITY = 'AUTHORITY',
  LICENSE = 'LICENSE',
  PURPOSE = 'PURPOSE'
}

export interface Clause {
  id: string;
  text: string;
  condition?: string; // e.g. "retention > 365 days"
}

export interface Selector {
  type: 'entity' | 'edge' | 'attribute' | 'source';
  value: string; // wildcard supported e.g. "source:twitter/*"
  allow: boolean;
}

export interface PurposeLimitation {
  purpose: string;
  allowed: boolean;
}

export interface BasePolicy {
  id: string;
  name: string;
  jurisdiction: string;
  clauses: Clause[];
  selectors: Selector[];
  retention: string; // ISO8601 duration or "forever"
  effectiveFrom: Date;
  effectiveTo?: Date;
}

export interface Authority extends BasePolicy {
  type: PolicyType.AUTHORITY;
  warrantId?: string;
  issuer: string;
}

export interface License extends BasePolicy {
  type: PolicyType.LICENSE;
  licensor: string;
  grants: string[]; // e.g. ["read", "distribute"]
  revocations: string[];
}

export interface Purpose extends BasePolicy {
  type: PolicyType.PURPOSE;
  intendedUse: string;
}

export interface PolicyBinding {
  id: string;
  policyId: string;
  targetId: string; // Case ID or Dataset ID
  active: boolean;
  overrides?: string[]; // IDs of clauses to override
}

// Compiler Output (IR)
export interface PolicyIR {
  version: string;
  compiledAt: string; // ISO Date
  hash: string; // Deterministic hash

  // Access Control Lists
  allowedEntities: string[];
  allowedEdges: string[];
  deniedSelectors: string[];

  // Field Redactions
  redactions: Record<string, string[]>; // Type -> Fields[]

  // Constraints
  retentionLimit: number; // Seconds
  exportAllowed: boolean;

  // Provenance
  activePolicies: string[]; // Names/IDs
  clausesUsed: string[];
}

export interface VerificationResult {
  passed: boolean;
  blockedReason?: string;
  remediation?: string;
}
