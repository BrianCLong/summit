/**
 * Data Integrity Envelope Types
 *
 * Ensures all API responses carry provenance, confidence, and governance metadata
 *
 * SOC 2 Controls: PI1.1, PI1.2, PI1.4, C1.2
 *
 * @module data-envelope
 */

import { createHash } from 'crypto';

/**
 * Provenance metadata for tracking data lineage and source
 */
export interface Provenance {
  /** Source identifier (system, model, user, or integration) */
  source: string;

  /** Timestamp when the data was generated (ISO 8601) */
  generatedAt: Date;

  /** Data lineage chain showing transformation history */
  lineage: LineageNode[];

  /** Actor who initiated or approved this operation */
  actor?: string;

  /** Source system version */
  version?: string;

  /** Unique identifier for this provenance entry */
  provenanceId: string;
}

/**
 * Single node in the data lineage chain
 */
export interface LineageNode {
  /** Unique identifier for this lineage step */
  id: string;

  /** Type of transformation or operation */
  operation: string;

  /** Input identifiers used in this step */
  inputs: string[];

  /** Timestamp of this transformation */
  timestamp: Date;

  /** Actor responsible for this step */
  actor?: string;

  /** Additional metadata for this step */
  metadata?: Record<string, any>;
}

/**
 * Governance result enumeration
 */
export enum GovernanceResult {
  ALLOW = 'ALLOW',
  DENY = 'DENY',
  FLAG = 'FLAG',
  REVIEW_REQUIRED = 'REVIEW_REQUIRED',
}

/**
 * Governance verdict reference for compliance tracking
 */
export interface GovernanceVerdict {
  /** Unique identifier for the governance decision */
  verdictId: string;

  /** Policy that was evaluated */
  policyId: string;

  /** Result of the policy evaluation */
  result: GovernanceResult;

  /** Timestamp of the decision */
  decidedAt: Date;

  /** Reason for the decision */
  reason?: string;

  /** Required approvals (if any) */
  requiredApprovals?: string[];

  /** Evaluator (human or automated) */
  evaluator: string;
}

/**
 * Data classification levels
 */
export enum DataClassification {
  PUBLIC = 'PUBLIC',
  INTERNAL = 'INTERNAL',
  CONFIDENTIAL = 'CONFIDENTIAL',
  RESTRICTED = 'RESTRICTED',
  HIGHLY_RESTRICTED = 'HIGHLY_RESTRICTED',
}

/**
 * Generic data envelope wrapping all API responses with integrity metadata
 */
export interface DataEnvelope<T = any> {
  /** The actual response payload (type-specific) */
  data: T;

  /** Provenance metadata for data lineage tracking */
  provenance: Provenance;

  /** Confidence score for AI-generated content (0.0 to 1.0). Null for non-AI data */
  confidence?: number;

  /** Flag indicating if this is simulated/synthetic data */
  isSimulated: boolean;

  /** Governance verdict reference (if applicable) */
  governanceVerdict?: GovernanceVerdict;

  /** Data classification level */
  classification: DataClassification;

  /** Integrity hash of the payload */
  dataHash: string;

  /** Digital signature (if signed) */
  signature?: string;

  /** Warnings or alerts about the data */
  warnings: string[];
}

/**
 * Export format enumeration
 */
export enum ExportFormat {
  PDF = 'PDF',
  CSV = 'CSV',
  JSON = 'JSON',
  EXCEL = 'EXCEL',
  XML = 'XML',
}

/**
 * Policy action enumeration
 */
export enum PolicyAction {
  ALLOW = 'ALLOW',
  DENY = 'DENY',
  REVIEW = 'REVIEW',
}

/**
 * Risk level enumeration
 */
export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Risk assessment for export
 */
export interface RiskAssessment {
  /** Risk level */
  level: RiskLevel;

  /** Risk factors identified */
  factors: string[];
}

/**
 * Policy decision for export
 */
export interface PolicyDecision {
  /** Action to take */
  action: PolicyAction;

  /** Reasons for the decision */
  reasons: string[];

  /** Required approvals (if any) */
  requiredApprovals?: string[];
}

/**
 * License check result for exports
 */
export interface LicenseCheckResult {
  /** Whether the export is allowed */
  valid: boolean;

  /** Reason if denied */
  reason?: string;

  /** Appeal code for manual review */
  appealCode?: string;

  /** Appeal URL */
  appealUrl?: string;

  /** Policy decision details */
  policyDecision: PolicyDecision;

  /** Risk assessment */
  riskAssessment: RiskAssessment;
}

/**
 * Batch export with full provenance
 */
export interface ExportBundle {
  /** Export identifier */
  exportId: string;

  /** Exported data items (each wrapped in envelope) */
  items: DataEnvelope[];

  /** Export provenance */
  provenance: Provenance;

  /** Export format (PDF, CSV, JSON, etc.) */
  format: ExportFormat;

  /** License information */
  licenses: string[];

  /** License compliance check */
  licenseCheck: LicenseCheckResult;

  /** Merkle root for bundle integrity */
  merkleRoot: string;

  /** Generated timestamp */
  generatedAt: Date;
}

/**
 * Configuration for simulation mode
 */
export interface SimulationConfig {
  /** Enable simulation mode */
  enabled: boolean;

  /** Simulation seed for reproducibility */
  seed?: string;

  /** Simulation scenario */
  scenario?: string;
}

/**
 * Helper function to create a data envelope
 */
export function createDataEnvelope<T>(
  data: T,
  options: {
    source: string;
    actor?: string;
    version?: string;
    confidence?: number;
    isSimulated?: boolean;
    classification?: DataClassification;
    governanceVerdict: GovernanceVerdict; // MANDATORY for GA
    lineage?: LineageNode[];
    warnings?: string[];
  }
): DataEnvelope<T> {
  // GA ENFORCEMENT: Verify governance verdict is present
  if (!options.governanceVerdict) {
    throw new Error('GA ENFORCEMENT: GovernanceVerdict is required (SOC 2 CC6.1, CC7.2)');
  }

  const provenanceId = generateProvenanceId();
  const generatedAt = new Date();

  // Calculate data hash
  const dataString = JSON.stringify(data);
  const dataHash = createHash('sha256').update(dataString).digest('hex');

  // Validate confidence score
  if (options.confidence !== undefined) {
    if (options.confidence < 0 || options.confidence > 1) {
      throw new Error('Confidence score must be between 0 and 1');
    }
  }

  // Build provenance
  const provenance: Provenance = {
    source: options.source,
    generatedAt,
    lineage: options.lineage || [],
    actor: options.actor,
    version: options.version,
    provenanceId,
  };

  return {
    data,
    provenance,
    confidence: options.confidence,
    isSimulated: options.isSimulated || false,
    governanceVerdict: options.governanceVerdict,
    classification: options.classification || DataClassification.INTERNAL,
    dataHash,
    warnings: options.warnings || [],
  };
}

/**
 * Helper function to validate a data envelope
 */
export function validateDataEnvelope<T>(envelope: DataEnvelope<T>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check required fields
  if (!envelope.provenance) {
    errors.push('Missing provenance metadata');
  }

  if (!envelope.provenance?.source) {
    errors.push('Missing provenance source');
  }

  if (!envelope.provenance?.generatedAt) {
    errors.push('Missing provenance timestamp');
  }

  if (!envelope.provenance?.provenanceId) {
    errors.push('Missing provenance ID');
  }

  if (envelope.isSimulated === undefined || envelope.isSimulated === null) {
    errors.push('Missing isSimulated flag');
  }

  if (!envelope.classification) {
    errors.push('Missing data classification');
  }

  if (!envelope.dataHash) {
    errors.push('Missing data hash');
  }

  if (!envelope.governanceVerdict) {
    errors.push('Missing governance verdict');
  } else {
    if (!envelope.governanceVerdict.verdictId) {
      errors.push('Missing verdict ID');
    }
    if (envelope.governanceVerdict.result === undefined) {
      errors.push('Missing governance result');
    }
    if (!envelope.governanceVerdict.decidedAt) {
      errors.push('Missing verdict decision time');
    }
    if (!envelope.governanceVerdict.evaluator) {
      errors.push('Missing verdict evaluator');
    }
    if (!envelope.governanceVerdict.policyId) {
      errors.push('Missing policy ID');
    }
  }

  // Validate confidence score if present
  if (envelope.confidence !== undefined && envelope.confidence !== null) {
    if (envelope.confidence < 0 || envelope.confidence > 1) {
      errors.push('Confidence score must be between 0 and 1');
    }
  }

  // Verify data hash
  const dataString = JSON.stringify(envelope.data);
  const expectedHash = createHash('sha256').update(dataString).digest('hex');
  if (envelope.dataHash !== expectedHash) {
    errors.push('Data hash mismatch - possible tampering detected');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Helper function to check if data requires high confidence
 */
export function requiresHighConfidence(
  envelope: DataEnvelope,
  threshold: number = 0.8
): boolean {
  if (envelope.confidence === undefined || envelope.confidence === null) {
    // Non-AI data passes by default
    return true;
  }

  return envelope.confidence >= threshold;
}

/**
 * Helper function to generate a unique provenance ID
 */
function generateProvenanceId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `prov-${timestamp}-${random}`;
}

/**
 * Helper function to add lineage node to envelope
 */
export function addLineageNode(
  envelope: DataEnvelope,
  operation: string,
  inputs: string[],
  actor?: string,
  metadata?: Record<string, any>
): DataEnvelope {
  const lineageNode: LineageNode = {
    id: `lineage-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    operation,
    inputs,
    timestamp: new Date(),
    actor,
    metadata,
  };

  return {
    ...envelope,
    provenance: {
      ...envelope.provenance,
      lineage: [...envelope.provenance.lineage, lineageNode],
    },
  };
}

/**
 * Helper to check if envelope contains AI-generated content
 */
export function isAIGenerated(envelope: DataEnvelope): boolean {
  return envelope.confidence !== undefined && envelope.confidence !== null;
}

/**
 * Helper to get confidence level category
 */
export function getConfidenceLevel(confidence?: number): 'high' | 'medium' | 'low' | 'none' {
  if (confidence === undefined || confidence === null) {
    return 'none';
  }

  if (confidence >= 0.8) {
    return 'high';
  } else if (confidence >= 0.5) {
    return 'medium';
  } else {
    return 'low';
  }
}
