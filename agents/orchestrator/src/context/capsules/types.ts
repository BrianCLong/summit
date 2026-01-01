/**
 * Invariant-Carrying Context Capsules (IC³) - Type Definitions
 *
 * Implements ADR-010: Embedding machine-verifiable invariants directly
 * into model context, making rule violations structurally impossible.
 *
 * @see docs/adr/ADR-010_invariant_carrying_context_capsules.md
 */

import { ContextSegment } from '../provenance/types.js';

/**
 * Invariant types supported by the capsule system
 */
export type InvariantType =
  | 'reasoning_constraint'  // Limits what model can reason about
  | 'data_usage'            // Controls how data can be used
  | 'output_class'          // Restricts output format/content
  | 'authority_scope';      // Defines permitted operations

/**
 * Severity levels for invariant violations
 */
export type InvariantSeverity = 'info' | 'warn' | 'block';

/**
 * Rule definitions for different invariant types
 */
export type InvariantRule =
  | { kind: 'forbid_topics'; topics: string[] }
  | { kind: 'require_clearance'; level: string }
  | { kind: 'output_must_match'; schema: JSONSchema }
  | { kind: 'no_external_calls'; strict: boolean }
  | { kind: 'data_retention'; maxDays: number }
  | { kind: 'custom_expression'; expr: string; language: 'rego' | 'cel' };

/**
 * JSON Schema definition (simplified)
 */
export interface JSONSchema {
  type: string;
  properties?: Record<string, JSONSchema>;
  required?: string[];
  additionalProperties?: boolean;
  [key: string]: unknown;
}

/**
 * Machine-verifiable invariant
 */
export interface Invariant {
  /** Unique identifier */
  id: string;

  /** Invariant classification */
  type: InvariantType;

  /** Machine-verifiable rule */
  rule: InvariantRule;

  /** Violation severity */
  severity: InvariantSeverity;

  /** Human-readable description */
  description: string;

  /** Optional remediation guidance */
  remediation?: string;
}

/**
 * Context capsule metadata
 */
export interface CapsuleMetadata {
  /** Creating agent identifier */
  createdBy: string;

  /** Permitted operations (e.g., ["read", "analyze"]) */
  authorityScope: string[];

  /** Optional expiration timestamp */
  validUntil?: Date;

  /** Policy domain classification */
  policyDomain: string;

  /** Creation timestamp */
  createdAt: Date;

  /** Optional additional metadata */
  [key: string]: unknown;
}

/**
 * Context capsule: self-contained, independently verifiable context unit
 */
export interface ContextCapsule {
  /** Cryptographic hash of (content + invariants + metadata) */
  id: string;

  /** The actual context segment */
  content: ContextSegment;

  /** Machine-verifiable invariants */
  invariants: Invariant[];

  /** Optional cryptographic signature (agent identity) */
  signature?: string;

  /** Capsule metadata */
  metadata: CapsuleMetadata;
}

/**
 * Violation types
 */
export type ViolationType =
  | 'hash_mismatch'         // Capsule content tampered with
  | 'invalid_signature'     // Signature verification failed
  | 'invariant_violated'    // Specific invariant rule broken
  | 'expired'               // Capsule past validUntil
  | 'insufficient_clearance' // Execution context lacks required clearance
  | 'forbidden_topic'       // Reasoning constraint violated
  | 'unauthorized_operation' // Authority scope exceeded
  | 'trust_tier_mismatch';  // Cross-agent trust level incompatible

/**
 * Invariant violation record
 */
export interface InvariantViolation {
  /** Capsule that violated */
  capsuleId: string;

  /** Invariant that was violated (if applicable) */
  invariantId?: string;

  /** Violation classification */
  violation: ViolationType;

  /** Violation severity */
  severity: InvariantSeverity;

  /** Detailed message */
  message: string;

  /** Optional remediation steps */
  remediation?: string;

  /** Timestamp of violation */
  timestamp: Date;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether capsules passed validation */
  valid: boolean;

  /** All violations detected */
  violations: InvariantViolation[];

  /** Action to take */
  action: 'permit' | 'deny_execution' | 'redact' | 'flag';

  /** Optional additional context */
  metadata?: Record<string, unknown>;
}

/**
 * Execution context for invariant validation
 */
export interface ExecutionContext {
  /** Session identifier */
  sessionId: string;

  /** Executing agent identifier */
  agentId: string;

  /** Agent's trust tier */
  agentTrustTier: string;

  /** Agent's clearance level */
  clearanceLevel?: string;

  /** Policy domain */
  policyDomain: string;

  /** Whether agent requires signed capsules */
  requireSignedCapsules: boolean;

  /** Timestamp of execution */
  executionTime: Date;

  /** Optional additional context */
  [key: string]: unknown;
}

/**
 * Agent trust model
 */
export interface Agent {
  /** Agent identifier */
  id: string;

  /** Trust tier */
  trustTier: number; // 0 = system, 1 = verified, 2 = user, 3 = external

  /** Required minimum trust tier for incoming capsules */
  requiredTrustTier: number;

  /** Policy domain */
  policyDomain: string;

  /** Whether this agent requires signed capsules */
  requireSignedCapsules: boolean;

  /** Public key for signature verification (if applicable) */
  publicKey?: string;
}

/**
 * Capsule acceptance decision
 */
export interface AcceptanceDecision {
  /** Whether capsule can be accepted */
  accepted: boolean;

  /** Reason for acceptance/rejection */
  reason: string;

  /** Any required transformations */
  requiredTransformations?: ('redact' | 'strip_signature' | 'downgrade_tier')[];
}

/**
 * Capsule forwarding record (for lineage tracking)
 */
export interface CapsuleForwarding {
  /** Original capsule ID */
  originalCapsuleId: string;

  /** Original creator agent ID */
  originalCreator: string;

  /** Forwarding chain (agent IDs in order) */
  forwardingChain: string[];

  /** Current holder */
  currentHolder: string;

  /** Timestamp of last forwarding */
  lastForwardedAt: Date;
}

/**
 * Capsule creation options
 */
export interface CapsuleCreationOptions {
  /** Whether to sign the capsule */
  sign?: boolean;

  /** Private key for signing (if sign=true) */
  privateKey?: string;

  /** Expiration duration (in milliseconds) */
  ttl?: number;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}
