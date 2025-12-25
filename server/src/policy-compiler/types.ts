
import { SensitivityClass } from '../pii/sensitivity.js';

export { SensitivityClass };

/**
 * Epic C1: Policy Model v0
 *
 * Defines the structured policy object and inputs for the compiler.
 */

export interface AuthorityRequirement {
  action: string; // e.g., 'query:graph', 'export:wallet', 'runbook:step'
  sensitivity: SensitivityClass;
  authorityType: string; // e.g., 'WARRANT', 'SUBPOENA', 'CONSENT'
  description?: string;
}

export interface LicenseConstraint {
  source: string; // e.g., 'twitter', 'linkedin', 'internal_hr'
  allowedActions: string[]; // e.g., ['read', 'aggregate', 'no-export']
  forbiddenActions?: string[];
  expirationDate?: Date;
  attributionRequired: boolean;
}

export interface PurposeTag {
  tag: string; // e.g., 'security_investigation', 'marketing_analytics'
  allowedUses: string[]; // e.g., ['internal_report', 'customer_facing']
  requiresApproval: boolean;
}

export interface RetentionRule {
  dataType: string; // e.g., 'pii:email', 'log:access'
  retentionDays: number;
  sensitivity: SensitivityClass;
}

export interface PolicySpec {
  version: string;
  tenantId: string;
  authorityRequiredFor: AuthorityRequirement[];
  licenseConstraints: LicenseConstraint[];
  purposeTags: PurposeTag[];
  retentionRules: RetentionRule[];
  defaultSensitivity: SensitivityClass;
}

/**
 * Epic C2: Compiler Outputs
 */

export enum EnforcementDecision {
  ALLOW = 'ALLOW',
  DENY = 'DENY',
  CONDITIONAL = 'CONDITIONAL', // e.g. "Allow if redacted"
}

export interface RemediationHint {
  action: string; // e.g. "Attach Authority", "Redact Field"
  details: string;
}

export interface DenialReason {
  code: string; // e.g. "MISSING_AUTHORITY", "LICENSE_RESTRICTION"
  humanMessage: string;
  remediationSteps: RemediationHint[];
  appealRoute?: string;
}

export interface EnforcementPlan {
  policyVersion: string;
  compiledAt: Date;
  planHash: string; // Deterministic hash of inputs

  // Decision Tables
  queryRules: Record<string, RuleEntry>; // key: resource/action
  exportRules: Record<string, RuleEntry>;
  runbookRules: Record<string, RuleEntry>;

  // Global Constraints
  purposeRegistry: Record<string, { allowedUses: string[] }>;
  retentionRegistry: Record<string, RetentionRule>;
}

export interface RuleEntry {
  decision: EnforcementDecision;
  conditions?: RuleCondition[];
  denialReason?: DenialReason;
  // If multiple rules apply, we might have a list of reasons/conditions
  additionalConditions?: RuleCondition[];
}

export interface RuleCondition {
  type: 'authority' | 'purpose' | 'license' | 'attribute';
  key: string;
  operator: 'eq' | 'contains' | 'present';
  value?: any;
}

/**
 * Epic C3: Runtime Context
 */

export interface RuntimeContext {
  user: {
    id: string;
    roles: string[];
    clearanceLevel: number;
  };
  action: {
    type: 'query' | 'export' | 'runbook';
    target: string; // resource ID or type
    requestedFields?: string[];
  };
  purpose?: string;
  activeAuthority?: string[]; // IDs of attached warrants/consents
}

export interface EnforcementResult {
  allowed: boolean;
  reason?: DenialReason;
  modifications?: {
    redactFields: string[];
    filterClauses: string[];
  };
  decisionId: string; // For audit logging
}
