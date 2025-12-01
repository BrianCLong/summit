
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
    purpose?: string;
    classification?: string[];
    // V2 Extensions stored in metadata for backward compatibility
    witness?: MutationWitness;
    attribution?: CrossServiceAttribution;
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
