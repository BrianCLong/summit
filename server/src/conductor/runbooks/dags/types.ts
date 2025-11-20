/**
 * DAG-Based Runbook Types
 *
 * Runbooks codified as Directed Acyclic Graphs with:
 * - Replay logs for auditability
 * - Gates for preconditions (legal basis, data license) and postconditions (KPIs, citations)
 * - Proof emission and citation enforcement
 * - Benchmark timing
 */

import { createHash } from 'crypto';

/**
 * Legal basis for data processing (GDPR Article 6)
 */
export enum LegalBasis {
  CONSENT = 'consent',
  CONTRACT = 'contract',
  LEGAL_OBLIGATION = 'legal_obligation',
  VITAL_INTERESTS = 'vital_interests',
  PUBLIC_TASK = 'public_task',
  LEGITIMATE_INTERESTS = 'legitimate_interests',
}

/**
 * Data license types
 */
export enum DataLicense {
  PROPRIETARY = 'proprietary',
  CC0 = 'cc0',
  CC_BY = 'cc_by',
  CC_BY_SA = 'cc_by_sa',
  CC_BY_NC = 'cc_by_nc',
  ODbL = 'odbl',
  PUBLIC_DOMAIN = 'public_domain',
  INTERNAL_USE_ONLY = 'internal_use_only',
}

/**
 * Precondition gates that must pass before node execution
 */
export interface PreconditionGate {
  type: 'legal_basis' | 'data_license' | 'approval' | 'dependency' | 'custom';
  name: string;
  description: string;

  // Legal basis check
  legalBasis?: LegalBasis[];

  // Data license check
  requiredLicenses?: DataLicense[];

  // Custom validation function
  validate?: (context: RunbookContext) => Promise<GateResult>;
}

/**
 * Postcondition gates that must pass after node execution
 */
export interface PostconditionGate {
  type: 'kpi' | 'citation' | 'proof' | 'quality' | 'custom';
  name: string;
  description: string;

  // KPI thresholds
  kpi?: {
    metric: string;
    threshold: number;
    operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
  };

  // Citation requirements
  citationRequirement?: {
    minCitations: number;
    requireSourceLinks: boolean;
    requireTimestamps: boolean;
  };

  // Proof requirements
  proofRequirement?: {
    requireCryptographicProof: boolean;
    requireChainOfCustody: boolean;
  };

  // Custom validation function
  validate?: (context: RunbookContext, result: NodeExecutionResult) => Promise<GateResult>;
}

/**
 * Gate execution result
 */
export interface GateResult {
  passed: boolean;
  reason?: string;
  metadata?: Record<string, any>;
}

/**
 * Citation for evidence
 */
export interface Citation {
  id: string;
  source: string;
  url?: string;
  timestamp: Date;
  author?: string;
  accessedAt: Date;
  hash?: string; // Hash of cited content for integrity
  metadata?: Record<string, any>;
}

/**
 * Cryptographic proof
 */
export interface CryptographicProof {
  algorithm: 'sha256' | 'sha512' | 'ed25519';
  signature: string;
  publicKey?: string;
  timestamp: Date;
  chainOfCustodyHash?: string;
}

/**
 * Evidence with citations and proofs
 */
export interface Evidence {
  id: string;
  type: string;
  data: any;
  citations: Citation[];
  proofs: CryptographicProof[];
  collectedAt: Date;
  metadata?: Record<string, any>;
}

/**
 * DAG Node representing a step in the runbook
 */
export interface DAGNode {
  id: string;
  name: string;
  description: string;

  // Dependencies (other node IDs that must complete first)
  dependencies: string[];

  // Gates
  preconditions: PreconditionGate[];
  postconditions: PostconditionGate[];

  // Execution
  execute: (context: RunbookContext) => Promise<NodeExecutionResult>;

  // Rollback in case of failure
  rollback?: (context: RunbookContext) => Promise<void>;

  // Metadata
  estimatedDuration?: number; // milliseconds
  timeout?: number; // milliseconds
  retryPolicy?: {
    maxRetries: number;
    backoffMs: number;
  };
}

/**
 * Node execution result
 */
export interface NodeExecutionResult {
  success: boolean;
  evidence: Evidence[];
  kpis: Record<string, number>;
  citations: Citation[];
  proofs: CryptographicProof[];
  duration: number; // milliseconds
  error?: Error;
  metadata?: Record<string, any>;
}

/**
 * Runbook DAG
 */
export interface RunbookDAG {
  id: string;
  name: string;
  description: string;
  version: string;

  nodes: DAGNode[];

  // Benchmark timing
  benchmarks: {
    total: number; // milliseconds
    perNode: Record<string, number>; // node ID -> milliseconds
  };

  // Publication gates
  publicationGates: PostconditionGate[];

  metadata?: Record<string, any>;
}

/**
 * Runbook execution context
 */
export interface RunbookContext {
  runbookId: string;
  executionId: string;
  tenantId: string;
  userId: string;

  // Input data
  input: Record<string, any>;

  // Shared state across nodes
  state: Map<string, any>;

  // Evidence collected so far
  evidence: Evidence[];

  // Citations collected so far
  citations: Citation[];

  // Proofs generated so far
  proofs: CryptographicProof[];

  // KPIs tracked
  kpis: Record<string, number>;

  // Legal and licensing
  legalBasis: LegalBasis;
  dataLicenses: DataLicense[];

  // Timing
  startTime: Date;

  // Replay log
  replayLog: ReplayLogEntry[];
}

/**
 * Replay log entry for auditability
 */
export interface ReplayLogEntry {
  id: string;
  timestamp: Date;
  nodeId: string;
  eventType: 'node_start' | 'node_complete' | 'node_error' | 'gate_check' | 'evidence_collected' | 'publication_blocked';

  // Event data
  data: {
    success?: boolean;
    duration?: number;
    gateResult?: GateResult;
    evidence?: Evidence;
    error?: string;
    reason?: string;
  };

  // Hash chain for integrity
  previousHash: string;
  hash: string;

  // Signature
  signature?: string;
}

/**
 * DAG execution result
 */
export interface DAGExecutionResult {
  executionId: string;
  success: boolean;

  // All evidence collected
  evidence: Evidence[];

  // All citations
  citations: Citation[];

  // All proofs
  proofs: CryptographicProof[];

  // KPIs achieved
  kpis: Record<string, number>;

  // Timing
  totalDuration: number;
  nodeDurations: Record<string, number>;
  benchmarkComparison: {
    expectedTotal: number;
    actualTotal: number;
    withinBenchmark: boolean;
  };

  // Publication status
  publicationAllowed: boolean;
  publicationBlockReasons: string[];

  // Replay log
  replayLog: ReplayLogEntry[];

  // Errors
  errors: Array<{
    nodeId: string;
    error: Error;
  }>;
}

/**
 * Helper function to create hash for replay log
 */
export function createReplayLogHash(entry: Omit<ReplayLogEntry, 'hash'>): string {
  const data = JSON.stringify({
    id: entry.id,
    timestamp: entry.timestamp.toISOString(),
    nodeId: entry.nodeId,
    eventType: entry.eventType,
    data: entry.data,
    previousHash: entry.previousHash,
  });
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Helper function to create citation hash
 */
export function createCitationHash(citation: Omit<Citation, 'hash'>): string {
  const data = JSON.stringify({
    source: citation.source,
    url: citation.url,
    timestamp: citation.timestamp.toISOString(),
    author: citation.author,
  });
  return createHash('sha256').update(data).digest('hex');
}
