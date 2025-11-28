// server/src/graph/schema.ts

/**
 * Defines the sensitivity levels for data within the IntelGraph.
 */
export type Sensitivity = 'public' | 'internal' | 'confidential' | 'secret' | 'top-secret';

/**
 * Base interface for all nodes in the IntelGraph.
 */
export interface BaseNode {
  id: string; // UUID
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
  owner: string; // User or Service ID
}

/**
 * Represents a person, organization, product, or any other noun.
 * An Entity is a central node to which claims are attached.
 */
export interface Entity extends BaseNode {
  name: string;
  description: string;
}

/**
 * A statement or assertion about an Entity.
 * Claims are the core informational unit.
 */
export interface Claim extends BaseNode {
  statement: string;
  confidence: number; // 0.0 to 1.0
  entityId: string;
}

/**
 * Represents a piece of data that supports or refutes a Claim.
 * Evidence provides the grounding for claims.
 */
export interface Evidence extends BaseNode {
  sourceURI: string; // URL or other resource identifier
  hash: string; // SHA-256 hash of the content, if applicable
  content: string; // The actual content or a snippet
  claimId: string;
}

/**
 * Represents a specific, auditable decision made based on IntelGraph data.
 * Decisions link to the claims and evidence that informed them.
 */
export interface Decision extends BaseNode {
  question: string;
  recommendation: string;
  rationale: string;
}

/**
 * A label for applying governance rules (e.g., access control, redaction).
 * Policies are attached to other nodes to enforce rules.
 */
export interface PolicyLabel extends BaseNode {
  label: string;
  sensitivity: Sensitivity;
}

// --- Edge Types ---

/**
 * Connects a Claim to an Entity.
 * Relationship: (Claim)-[RELATES_TO]->(Entity)
 */
export interface RelatesToEdge {
  type: 'RELATES_TO';
}

/**
 * Connects Evidence to a Claim.
 * Relationship: (Evidence)-[SUPPORTS]->(Claim)
 */
export interface SupportsEdge {
  type: 'SUPPORTS';
}

/**
 * Connects a Decision to the Claims that informed it.
 * Relationship: (Decision)-[INFORMED_BY]->(Claim)
 */
export interface InformedByEdge {
  type: 'INFORMED_BY';
}

/**
 * Connects a PolicyLabel to any other node.
 * Relationship: (AnyNode)-[HAS_POLICY]->(PolicyLabel)
 */
export interface HasPolicyEdge {
  type: 'HAS_POLICY';
}
