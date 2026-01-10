export interface BasePolicyRef {
  /** Identifier for the base policy bundle (e.g., global/default). */
  id: string;
  /** Semantic version of the base policy bundle. */
  version: string;
  /** Optional URI or path pointing to the base bundle artifact. */
  source?: string;
}

export interface PolicyRule {
  /** Unique rule identifier. */
  id: string;
  /** Human-readable description of the rule intent. */
  description?: string;
  /** Policy decision effect. */
  effect: 'allow' | 'deny' | string;
  /** Arbitrary condition payload (OPA/Rego or predicate metadata). */
  condition?: Record<string, unknown>;
  /** Additional metadata for policy engines or auditors. */
  metadata?: Record<string, unknown>;
}

export type OverlayOperation = 'override' | 'append' | 'remove';

export interface OverlayPatch {
  /** Operation to apply against the base policy rule set. */
  op: OverlayOperation;
  /** Target rule identifier (used for override/remove). */
  ruleId: string;
  /** Replacement or new rule (required for override/append). */
  rule?: PolicyRule;
  /** Optional note to capture reviewer intent. */
  note?: string;
}

export interface TenantOverlayConfig {
  /** Tenant identifier that owns the overlay. */
  tenantId: string;
  /** Reference to the base policy bundle being overlaid. */
  base: BasePolicyRef;
  /** Ordered list of overlay patches (deterministic application). */
  patches: OverlayPatch[];
  /** Free-form metadata to aid provenance and audits. */
  metadata?: Record<string, unknown>;
}

export interface MergedPolicy {
  base: BasePolicyRef;
  tenantId: string;
  rules: PolicyRule[];
  appliedPatches: OverlayPatch[];
}
