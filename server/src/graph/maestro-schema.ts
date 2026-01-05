
/**
 * @interface WorkflowDefinition
 * @extends Entity
 * @description Represents a reusable definition of a workflow, including its steps, inputs, and outputs.
 */
export interface WorkflowDefinition extends Entity {
  /** The version of the workflow definition. */
  version: string;
  /** The tenant ID this definition belongs to. */
  tenantId: string;
  /** The environment this definition is scoped to (e.g., 'prod', 'staging'). */
  env: string;
  /** The retention policy class for runs of this workflow. */
  retentionClass: string;
  /** The cost center to charge for runs of this workflow. */
  costCenter: string;
  /** The JSON schema for the inputs. */
  inputSchema: string; // JSON string
  /** The JSON schema for the outputs. */
  outputSchema: string; // JSON string
  /** The raw definition body (DSL). */
  body: string;
}

/**
 * @interface Run
 * @extends Entity
 * @description Represents a specific execution instance of a WorkflowDefinition.
 */
export interface Run extends Entity {
  /** The tenant ID for this run. */
  tenantId: string;
  /** The environment where this run is executing. */
  env: string;
  /** The current status of the run. */
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'NEEDS_APPROVAL';
  /** The start time of the run. */
  startedAt?: string;
  /** The completion time of the run. */
  completedAt?: string;
  /** The cost center for this run (inherited or overridden). */
  costCenter: string;
  /** The input payload for this run. */
  input: string; // JSON string
  /** The output payload for this run. */
  output?: string; // JSON string
  /** Error details if failed. */
  error?: string;
}

/**
 * @interface Step
 * @extends Entity
 * @description Represents a single unit of work within a Run.
 */
export interface Step extends Entity {
  /** The tenant ID. */
  tenantId: string;
  /** The name or identifier of the step. */
  stepId: string;
  /** The status of the step. */
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  /** Start time. */
  startedAt?: string;
  /** Completion time. */
  completedAt?: string;
  /** Input for this specific step. */
  input: string; // JSON string
  /** Output from this step. */
  output?: string; // JSON string
  /** Error details. */
  error?: string;
}

/**
 * @interface Artifact
 * @extends Entity
 * @description Represents a tangible output produced by a Run or Step (file, data blob, etc.).
 */
export interface Artifact extends Entity {
  /** The tenant ID. */
  tenantId: string;
  /** The URI where the artifact is stored. */
  uri: string;
  /** The MIME type of the artifact. */
  mimeType: string;
  /** The size in bytes. */
  sizeBytes: number;
  /** Checksum for integrity verification. */
  checksum: string;
}

/**
 * @interface ApprovalRequest
 * @extends BaseNode
 * @description Represents a request for human or automated approval to proceed with a Run or Step.
 */
export interface ApprovalRequest extends BaseNode {
  /** The tenant ID. */
  tenantId: string;
  /** The environment. */
  env: string;
  /** The ID of the user who triggered the request. */
  requesterId: string;
  /** The role required to approve. */
  requiredRole: string;
  /** The status of the request. */
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  /** The rationale provided by the approver. */
  rationale?: string;
  /** The ID of the approver. */
  approverId?: string;
  /** Timestamp of decision. */
  decidedAt?: string;
}

/**
 * @interface PolicyDecision
 * @extends BaseNode
 * @description Represents a recorded decision made by the policy engine (OPA).
 */
export interface PolicyDecision extends BaseNode {
  /** The tenant ID. */
  tenantId: string;
  /** The policy bundle version used. */
  policyVersion: string;
  /** The decision result (ALLOW, DENY, ADVISE). */
  outcome: 'ALLOW' | 'DENY' | 'ADVISE';
  /** The input hash sent to OPA. */
  inputHash: string;
  /** The full rationale/reasons returned by OPA. */
  evaluationLog: string; // JSON string
}

/**
 * @interface Receipt
 * @extends BaseNode
 * @description Represents a cryptographically signed proof of execution.
 */
export interface Receipt extends BaseNode {
  /** The tenant ID. */
  tenantId: string;
  /** The digest of the data being attested. */
  digest: string;
  /** The cryptographic signature. */
  signature: string;
  /** The Key ID used for signing. */
  kid: string;
  /** Timestamp of issuance. */
  issuedAt: string;
}
