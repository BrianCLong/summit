// src/context/capsules/types.ts
// Core type definitions for Invariant-Carrying Context Capsules (IC³) system

export interface ContextCapsule {
  id: string;                    // Unique capsule identifier
  content: ContextContent;       // The actual context content
  invariants: Invariant[];       // Embedded machine-verifiable constraints
  signature: string;             // Cryptographic signature binding content to invariants
  metadata: CapsuleMetadata;     // Source and authority metadata
  timestamp: Date;               // Creation timestamp
  version: string;               // Capsule format version
}

export interface ContextContent {
  type: 'text' | 'structured' | 'binary' | 'embedding';
  data: string | object | Uint8Array;
  format?: string;              // Format specification if applicable
  encoding?: string;            // Encoding if applicable
}

export interface Invariant {
  id: string;                    // Unique invariant identifier
  type: InvariantType;          // Type of constraint
  specification: InvariantSpec;  // Formal specification in machine-verifiable language
  signature: string;             // Cryptographic binding to content
  authority: AuthorityLevel;     // Source authority level
  createdAt: Date;              // Creation timestamp
  active: boolean;              // Whether the invariant is currently active
}

export interface CapsuleMetadata {
  source: string;               // Origin of the context
  trustTier: TrustTier;         // Trust level classification
  policyDomain: string;         // Applicable policy domain
  verificationStatus: VerificationStatus; // Integrity verification
  agentIdentity?: string;       // Optional agent identity if applicable
}

export interface InvariantSpec {
  language: string;             // Language of the specification (e.g., "ic3-dsl")
  expression: string;          // The actual specification as a string
  parameters?: Record<string, any>; // Additional parameters for the specification
}

export type InvariantType = 
  | 'data-flow'                 // Constraints on data movement
  | 'reasoning-step'            // Constraints on reasoning paths
  | 'output-format'             // Constraints on output format
  | 'content-class'             // Constraints on content types
  | 'authority-scope'           // Constraints on authority levels
  | 'temporal'                  // Constraints based on time
  | 'geographic'                // Constraints based on location
  | 'sensitive-data'            // Constraints on sensitive information
  | 'context-size'              // Constraints on context size
  | 'token-limit'               // Constraints on token usage
  | 'source-verification'       // Constraints on source verification
  | 'usage-logging'             // Constraints requiring usage logging
  | 'privacy-compliance'        // Privacy regulation compliance requirements
  | 'content-provenance'        // Constraints on content origin tracking
  | 'execution-duration'        // Constraints on maximum execution time
  | 'resource-consumption'      // Constraints on computational resource usage
  | 'trust-propagation'         // How trust propagates through context
  | 'knowledge-boundary'        // Constraints on knowledge source boundaries
  | 'semantic-coherence'        // Constraints on logical consistency
  | 'cognitive-load'            // Constraints on cognitive complexity
  | 'bias-mitigation'           // Constraints to prevent bias propagation
  | 'fact-verification'         // Requirements for fact-checking
  | 'attribution-requirement'   // Requirements for source attribution
  | 'reproducibility'           // Requirements for result reproducibility
  | 'interpretability'          // Requirements for interpretability
  | 'accountability'            // Requirements for decision accountability
  | 'fairness-constraint'       // Requirements for fair processing
  | 'safety-boundary'           // Constraints for safety enforcement
  | 'ethics-compliance'         // Requirements for ethical compliance;

export type AuthorityLevel = 'system' | 'admin' | 'verified-user' | 'unverified-user' | 'external';

export type TrustTier = 'high' | 'medium' | 'low' | 'untrusted';

export type VerificationStatus = 'verified' | 'pending' | 'failed' | 'revoked';

export interface CapsuleValidationResult {
  isValid: boolean;
  violations: ConstraintViolation[];
  enforcementRecommendation: EnforcementAction;
  validationTime: Date;
}

export interface ConstraintViolation {
  invariantId: string;
  capsuleId: string;
  type: 'syntax' | 'semantic' | 'conflict' | 'authority' | 'integrity';
  details: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export type EnforcementAction = 'reject' | 'modify' | 'approve' | 'kill-switch' | 'quarantine' | 'audit-only';

// Interfaces for the system components
export interface ContextCapsuleGenerator {
  createCapsule(content: ContextContent, invariants: Invariant[]): Promise<ContextCapsule>;
  validateCapsule(capsule: ContextCapsule): Promise<CapsuleValidationResult>;
  updateCapsule(capsule: ContextCapsule, newContent: ContextContent): Promise<ContextCapsule>;
  mergeCapsules(capsules: ContextCapsule[]): Promise<ContextCapsule | null>;
}

export interface InvariantEmbedder {
  embedInvariants(content: ContextContent, specs: InvariantSpec[]): Promise<Invariant[]>;
  validateInvariantBinding(capsule: ContextCapsule): Promise<boolean>;
  checkInvariantCompatibility(invariants: Invariant[]): Promise<InvariantCompatibilityResult>;
  generateInvariant(spec: InvariantSpec, authority: AuthorityLevel): Promise<Invariant>;
}

export interface InvariantValidator {
  validateCapsule(capsule: ContextCapsule): Promise<CapsuleValidationResult>;
  validateCapsuleSet(capsules: ContextCapsule[]): Promise<CapsuleValidationResult>;
  checkTransitiveConstraints(capsules: ContextCapsule[]): Promise<ConstraintViolation[]>;
  enforceViolation(capsule: ContextCapsule, violation: ConstraintViolation): Promise<EnforcementAction>;
}

export interface InvariantCompatibilityResult {
  isCompatible: boolean;
  conflicts: InvariantConflict[];
  warnings: string[];
}

export interface InvariantConflict {
  invariantA: string;
  invariantB: string;
  conflictType: string;
  details: string;
}