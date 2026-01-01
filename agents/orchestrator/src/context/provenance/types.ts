/**
 * Context Provenance Graph (CPG) - Type Definitions
 *
 * Implements ADR-009: Cryptographic tracking, versioning, and policy enforcement
 * over model context at token-range granularity.
 *
 * @see docs/adr/ADR-009_context_provenance_graph.md
 */

/**
 * Trust tier classification for context segments
 */
export type TrustTier = 'system' | 'verified' | 'user' | 'external';

/**
 * Verification status for cryptographic integrity
 */
export type VerificationStatus = 'signed' | 'unsigned' | 'revoked';

/**
 * Context segment types
 */
export type SegmentType = 'instruction' | 'event' | 'artifact' | 'memory';

/**
 * Metadata associated with each context segment
 */
export interface SegmentMetadata {
  /** Originating agent identifier */
  sourceAgentId?: string;

  /** Trust classification level */
  trustTier: TrustTier;

  /** Policy domain for enforcement rules */
  policyDomain: string;

  /** Cryptographic verification state */
  verificationStatus: VerificationStatus;

  /** Creation timestamp */
  timestamp: Date;

  /** Optional parent segment hashes (for cryptographic linking) */
  parentHashes?: string[];

  /** Optional agent signature */
  signature?: string;
}

/**
 * Addressable context segment with cryptographic identifier
 */
export interface ContextSegment {
  /** SHA-256 hash of (content + metadata) */
  id: string;

  /** Segment classification */
  type: SegmentType;

  /** Actual content (text, code, data) */
  content: string;

  /** Provenance and security metadata */
  metadata: SegmentMetadata;
}

/**
 * Edge types in the provenance graph
 */
export type EdgeType =
  | 'DERIVED_FROM'   // Segment B was transformed from Segment A
  | 'INCLUDES'       // Compiled context includes this segment
  | 'ORIGINATED_BY'  // Segment was created by Agent X
  | 'SUPERSEDES'     // New segment replaces old (versioning)
  | 'VIOLATES_INVARIANT'; // Segment violated an invariant

/**
 * Directed edge in the provenance graph
 */
export interface ProvenanceEdge {
  /** Edge identifier */
  id: string;

  /** Source node (segment ID) */
  from: string;

  /** Target node (segment ID) */
  to: string;

  /** Edge classification */
  type: EdgeType;

  /** Optional metadata (e.g., transformation description) */
  metadata?: Record<string, unknown>;

  /** Creation timestamp */
  timestamp: Date;
}

/**
 * Node in the provenance graph (wraps ContextSegment)
 */
export interface ProvenanceNode {
  /** Node identifier (same as segment.id) */
  id: string;

  /** The context segment this node represents */
  segment: ContextSegment;

  /** Incoming edges (derivation sources) */
  incomingEdges: ProvenanceEdge[];

  /** Outgoing edges (descendants) */
  outgoingEdges: ProvenanceEdge[];

  /** Revocation status */
  revoked: boolean;

  /** Optional revocation metadata */
  revocationMetadata?: {
    revokedAt: Date;
    revokedBy: string;
    reason: string;
  };
}

/**
 * Complete provenance graph for a session or context compilation
 */
export interface ProvenanceGraph {
  /** Graph identifier (typically session ID + compilation timestamp) */
  id: string;

  /** All nodes in the graph */
  nodes: Map<string, ProvenanceNode>;

  /** All edges in the graph */
  edges: ProvenanceEdge[];

  /** Root nodes (segments with no incoming edges) */
  roots: Set<string>;

  /** Creation timestamp */
  createdAt: Date;

  /** Optional session identifier */
  sessionId?: string;
}

/**
 * Policy rule for context segment enforcement
 */
export interface PolicyRule {
  /** Rule identifier */
  id: string;

  /** Human-readable description */
  description: string;

  /** Predicate to test if rule applies to segment */
  condition: (segment: ContextSegment) => boolean;

  /** Action to take if condition is true */
  action: 'permit' | 'deny' | 'redact' | 'flag';

  /** Justification for the rule */
  justification: string;

  /** Severity level */
  severity: 'info' | 'warn' | 'block';
}

/**
 * Policy violation record
 */
export interface PolicyViolation {
  /** Violated rule ID */
  ruleId: string;

  /** Affected segment ID */
  segmentId: string;

  /** Violation message */
  message: string;

  /** Action taken */
  action: 'permit' | 'deny' | 'redact' | 'flag';

  /** Timestamp of violation */
  timestamp: Date;

  /** Optional remediation guidance */
  remediation?: string;
}

/**
 * Result of policy enforcement
 */
export interface EnforcementResult {
  /** Whether execution should proceed */
  allowed: boolean;

  /** All violations detected */
  violations: PolicyViolation[];

  /** Redacted segment IDs (if any) */
  redactedSegments: string[];

  /** Flagged segment IDs (for audit) */
  flaggedSegments: string[];
}

/**
 * Snapshot of a provenance graph at a specific timestamp
 */
export interface ProvenanceSnapshot {
  /** Snapshot identifier */
  id: string;

  /** Graph state at this timestamp */
  graph: ProvenanceGraph;

  /** Timestamp of snapshot */
  timestamp: Date;

  /** Segments that were active (not revoked) at this time */
  activeSegments: Set<string>;
}

/**
 * Query parameters for provenance graph exploration
 */
export interface ProvenanceQuery {
  /** Filter by session ID */
  sessionId?: string;

  /** Filter by agent ID */
  agentId?: string;

  /** Filter by time range */
  timeRange?: {
    start: Date;
    end: Date;
  };

  /** Filter by trust tier */
  trustTier?: TrustTier;

  /** Filter by policy domain */
  policyDomain?: string;

  /** Include revoked segments */
  includeRevoked?: boolean;
}

/**
 * Revocation request
 */
export interface RevocationRequest {
  /** Segment ID to revoke */
  segmentId: string;

  /** Requesting agent/user ID */
  requestedBy: string;

  /** Reason for revocation */
  reason: string;

  /** Whether to propagate revocation transitively */
  propagate: boolean;

  /** Optional timestamp (defaults to now) */
  timestamp?: Date;
}

/**
 * Revocation result
 */
export interface RevocationResult {
  /** Successfully revoked segment IDs */
  revokedSegments: string[];

  /** Number of descendant segments affected */
  cascadeCount: number;

  /** Sessions requiring re-compilation */
  affectedSessions: string[];

  /** Timestamp of revocation */
  timestamp: Date;
}
