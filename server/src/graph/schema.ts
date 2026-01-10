// server/src/graph/schema.ts

/**
 * @type {Sensitivity}
 * @description Defines the hierarchical sensitivity levels for data within the IntelGraph.
 * This is used by governance policies to determine access and handling rules.
 */
export type Sensitivity = 'public' | 'internal' | 'confidential' | 'secret' | 'top-secret';

/**
 * @interface BaseNode
 * @description A base interface containing common properties for all nodes in the IntelGraph.
 * Every node type extends this interface.
 */
export interface BaseNode {
  /** A unique UUID (v4) for the node. */
  id: string;
  /** An ISO 8601 timestamp representing when the node was created. */
  createdAt: string;
  /** An ISO 8601 timestamp representing when the node was last updated. */
  updatedAt: string;
  /** The ID of the user or service that owns this node. */
  owner: string;
}

/**
 * @interface Entity
 * @extends BaseNode
 * @description Represents a person, organization, product, or any other conceptual noun in the graph.
 * An Entity is a central node to which claims are attached.
 */
export interface Entity extends BaseNode {
  /** The primary name or identifier for the entity. */
  name: string;
  /** A detailed description of the entity. */
  description: string;
}

/**
 * @interface Claim
 * @extends BaseNode
 * @description Represents a statement or assertion about an Entity. Claims are the
 * core informational units that form the basis of the provenance trail.
 */
export interface Claim extends BaseNode {
  /** The textual content of the claim or assertion. */
  statement: string;
  /** A numerical value from 0.0 to 1.0 representing the confidence in the claim's validity. */
  confidence: number;
  /** The ID of the Entity this claim is about. */
  entityId: string;
}

/**
 * @interface Evidence
 * @extends BaseNode
 * @description Represents a piece of data that supports or refutes a Claim.
 * Evidence provides the verifiable grounding for claims.
 */
export interface Evidence extends BaseNode {
  /** A URL or other resource identifier pointing to the source of the evidence. */
  sourceURI: string;
  /** A cryptographic hash (e.g., SHA-256) of the source content to ensure integrity. */
  hash: string;
  /** The actual content of the evidence, or a relevant snippet. */
  content: string;
  /** The ID of the Claim this evidence supports or refutes. */
  claimId: string;
}

/**
 * @interface Decision
 * @extends BaseNode
 * @description Represents a specific, auditable decision made based on the information
 * and analysis of data within the IntelGraph.
 */
export interface Decision extends BaseNode {
  /** The question that this decision was intended to answer. */
  question: string;
  /** The final recommendation or outcome of the decision process. */
  recommendation: string;
  /** The reasoning or justification behind the recommendation. */
  rationale: string;
}

/**
 * @interface PolicyLabel
 * @extends BaseNode
 * @description A label used to attach governance rules (e.g., access control, redaction)
 * to any other node in the graph.
 */
export interface PolicyLabel extends BaseNode {
  /** The name of the policy label (e.g., "PII", "EXPORT_CONTROLLED"). */
  label: string;
  /** The sensitivity level associated with this policy. */
  sensitivity: Sensitivity;
}

/**
 * @interface MaestroRun
 * @extends BaseNode
 * @description Represents a Maestro orchestration run in the graph.
 */
export interface MaestroRun extends BaseNode {
  /** Tenant scope for the run. */
  tenantId: string;
  /** Current status for the run lifecycle. */
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  /** Request text or input summary for the run. */
  requestText?: string;
  /** When the run started. */
  startedAt?: string;
  /** When the run completed. */
  completedAt?: string;
}

/**
 * @interface MaestroStep
 * @extends BaseNode
 * @description Represents a step (task) within a Maestro run.
 */
export interface MaestroStep extends BaseNode {
  /** Parent run ID. */
  runId: string;
  /** Tenant scope for the step. */
  tenantId: string;
  /** Status for the step. */
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  /** Step kind (planner/action/etc). */
  kind: string;
  /** Human-readable summary. */
  description?: string;
}

/**
 * @interface MaestroReceipt
 * @extends BaseNode
 * @description Represents a receipt (input/output) produced or consumed by Maestro.
 */
export interface MaestroReceipt extends BaseNode {
  /** Parent run ID. */
  runId: string;
  /** Optional step ID associated with the receipt. */
  stepId?: string;
  /** Receipt kind (request, artifact, etc.). */
  kind: string;
  /** Optional label for display. */
  label?: string;
}

/**
 * @interface MaestroApproval
 * @extends BaseNode
 * @description Represents an approval decision in Maestro governance flows.
 */
export interface MaestroApproval extends BaseNode {
  /** Parent run ID. */
  runId?: string;
  /** Approval status. */
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  /** Requester or approver reference. */
  actorId?: string;
  /** Approval action type. */
  action?: string;
}

// --- Edge Types ---

/**
 * @interface RelatesToEdge
 * @description Defines the relationship connecting a Claim to an Entity.
 * The direction is (Claim)-[RELATES_TO]->(Entity).
 */
export interface RelatesToEdge {
  type: 'RELATES_TO';
}

/**
 * @interface SupportsEdge
 * @description Defines the relationship connecting an Evidence to a Claim.
 * The direction is (Evidence)-[SUPPORTS]->(Claim).
 */
export interface SupportsEdge {
  type: 'SUPPORTS';
}

/**
 * @interface InformedByEdge
 * @description Defines the relationship connecting a Decision to the Claims that informed it.
 * The direction is (Decision)-[INFORMED_BY]->(Claim).
 */
export interface InformedByEdge {
  type: 'INFORMED_BY';
}

/**
 * @interface HasPolicyEdge
 * @description Defines the relationship connecting any node to a PolicyLabel.
 * The direction is (AnyNode)-[HAS_POLICY]->(PolicyLabel).
 */
export interface HasPolicyEdge {
  type: 'HAS_POLICY';
}

/**
 * @interface TriggeredByEdge
 * @description Links a Maestro run or step to the user/system that triggered it.
 */
export interface TriggeredByEdge {
  type: 'TRIGGERED_BY';
}

/**
 * @interface InTenantEdge
 * @description Links a Maestro node to its tenant boundary.
 */
export interface InTenantEdge {
  type: 'IN_TENANT';
}

/**
 * @interface ConsumedEdge
 * @description Links a Maestro step to receipts it consumed.
 */
export interface ConsumedEdge {
  type: 'CONSUMED';
}

/**
 * @interface ProducedEdge
 * @description Links a Maestro run/step to receipts it produced.
 */
export interface ProducedEdge {
  type: 'PRODUCED';
}
