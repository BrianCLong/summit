
// Base Types for Provenance

export type MutationType = 'CREATE' | 'UPDATE' | 'DELETE' | 'LINK' | 'UNLINK' | 'MERGE';

export interface EntityState {
  id: string;
  type: string;
  version: number;
  data: Record<string, any>;
  metadata: Record<string, any>;
}

export interface JsonPatch {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
  path: string;
  value?: any;
  from?: string;
}

export interface MutationPayload {
  mutationType: MutationType;
  entityId: string;
  entityType: string;
  previousState?: EntityState; // null for CREATE
  newState?: EntityState;     // null for DELETE
  diff?: JsonPatch[];         // RFC 6902 JSON Patch
  reason?: string;
  // Additional properties from various usages
  sourceId?: string;
  hash?: string;
  bucket?: string;
  remaining?: number;
  modelName?: string;
  versions?: any;
  stage?: string;
  [key: string]: any; // Allow additional properties
}

export interface MutationWitness {
  witnessId: string;
  timestamp: string;
  signature: string;
  algorithm: string;
  validationResult: {
    valid: boolean;
    policyId?: string;
    checks: Array<{
      check: string;
      passed: boolean;
      message?: string;
    }>;
  };
}

export interface ReceiptEvidence {
  receiptId: string;
  entryId: string;
  action: string;
  actorId: string;
  tenantId: string;
  resourceId: string;
  inputHash: string;
  policyDecisionId?: string;
  signature: string;
  signerKeyId: string;
  issuedAt: string;
}

export interface RecoveryEvidence {
  drillId: string;
  scenario: string;
  status: 'pending' | 'successful' | 'failed';
  startedAt: string;
  completedAt?: string;
  rtoTarget: string;
  rpoTarget: string;
  rtoActual?: string;
  rpoActual?: string;
  evidenceArtifacts: string[];
  notes?: string;
}

export interface CrossServiceAttribution {
  originService: string;
  originRegion?: string;
  traceId: string;
  upstreamEvents?: Array<{
    service: string;
    eventId: string;
    timestamp: string;
  }>;
}

export interface ProvenanceEntry {
  id: string;
  tenantId: string;
  sequenceNumber: bigint;
  previousHash: string;
  currentHash: string;
  timestamp: Date;
  actionType: string;
  resourceType: string;
  resourceId: string;
  actorId: string;
  actorType: 'user' | 'system' | 'api' | 'job';
  // Payload can be generic or typed
  payload: Record<string, any> | MutationPayload;
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    requestId?: string;
    policyDecisionId?: string;
    policyVersion?: string;
    complianceMode?: boolean;
    purpose?: string;
    classification?: string[];
    // V2 Extensions stored in metadata for backward compatibility
    witness?: MutationWitness;
    attribution?: CrossServiceAttribution;
    receipt?: ReceiptEvidence;
    recovery?: RecoveryEvidence;
    // Additional properties from various usages
    correlationId?: string;
    connectorType?: string;
    environment?: string;
    method?: string;
    jobId?: string;
    domain?: string;
    modelId?: string;
    traceId?: string;
    [key: string]: any; // Allow additional properties
  };
  signature?: string;
  attestation?: {
    policy: string;
    evidence: Record<string, any>;
    timestamp: Date;
  };
}

// Extend base ProvenanceEntry to include V2 fields explicitly in the type system
// even if they are stored in metadata in the DB
export interface ProvenanceEntryV2 extends ProvenanceEntry {
  witness?: MutationWitness;
  attribution?: CrossServiceAttribution;
  // Payload is strictly typed in V2
  payload: MutationPayload;
}

// --- Canonical Graph Types (Sprint N+62) ---

export type ProvenanceNodeType = 'Input' | 'Decision' | 'Action' | 'Outcome';

export interface CanonicalNode {
  id: string;
  tenantId: string;
  nodeType: ProvenanceNodeType;
  subType: string; // e.g., 'PolicyDefinition', 'MaestroRun'
  label: string;
  timestamp: string;
  metadata: Record<string, any>;
  // Verification
  hash?: string;
  sourceEntryId?: string; // Link back to Ledger Entry
}

export interface CanonicalEdge {
  sourceId: string;
  targetId: string;
  relation: 'FED_INTO' | 'USED_BY' | 'TRIGGERED' | 'BLOCKED' | 'PRODUCED' | 'GENERATED' | 'AFFECTED' | 'DERIVED_FROM';
  timestamp: string;
  properties?: Record<string, any>;
}

// Specialized Node Interfaces for Type Safety

export interface InputNode extends CanonicalNode {
  nodeType: 'Input';
  hash: string;
  uri?: string;
  version?: string;
}

export interface DecisionNode extends CanonicalNode {
  nodeType: 'Decision';
  result: 'ALLOW' | 'DENY' | 'FLAG' | 'APPROVED' | 'REJECTED' | 'UNKNOWN';
  confidence?: number;
  evaluator?: string;
}

export interface ActionNode extends CanonicalNode {
  nodeType: 'Action';
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  durationMs?: number;
  startedAt?: string;
  completedAt?: string;
}

export interface OutcomeNode extends CanonicalNode {
  nodeType: 'Outcome';
  value: any;
  dimension?: string;
}
