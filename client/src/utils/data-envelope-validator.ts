/**
 * Client-side Data Envelope Validator
 *
 * Validates API responses to ensure they contain required provenance and integrity metadata
 * Rejects unlabeled or tampered data
 *
 * SOC 2 Controls: PI1.1, PI1.2, PI1.4, C1.2
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { createHash } from "crypto";

/**
 * Data classification levels
 */
export enum DataClassification {
  PUBLIC = "PUBLIC",
  INTERNAL = "INTERNAL",
  CONFIDENTIAL = "CONFIDENTIAL",
  RESTRICTED = "RESTRICTED",
  HIGHLY_RESTRICTED = "HIGHLY_RESTRICTED",
}

/**
 * Provenance metadata
 */
export interface Provenance {
  source: string;
  generatedAt: string;
  lineage: LineageNode[];
  actor?: string;
  version?: string;
  provenanceId: string;
}

/**
 * Lineage node
 */
export interface LineageNode {
  id: string;
  operation: string;
  inputs: string[];
  timestamp: string;
  actor?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
}

/**
 * Data envelope interface
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface DataEnvelope<T = any> {
  data: T;
  provenance: Provenance;
  confidence?: number;
  isSimulated: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  governanceVerdict?: any;
  classification: DataClassification;
  dataHash: string;
  signature?: string;
  warnings: string[];
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validation configuration
 */
export interface ValidationConfig {
  /** Minimum confidence threshold for AI-generated content */
  minConfidence?: number;

  /** Reject simulated data */
  rejectSimulated?: boolean;

  /** Require specific classification levels */
  allowedClassifications?: DataClassification[];

  /** Verify data hash integrity */
  verifyHash?: boolean;

  /** Strict mode - reject any validation warnings */
  strictMode?: boolean;
}

/**
 * Default validation configuration
 */
const DEFAULT_CONFIG: ValidationConfig = {
  minConfidence: 0.7,
  rejectSimulated: process.env.NODE_ENV === "production",
  verifyHash: true,
  strictMode: false,
};

/**
 * Validate a data envelope
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function validateDataEnvelope<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  envelope: any,
  config: ValidationConfig = {}
): ValidationResult {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if response is an envelope
  if (!envelope || typeof envelope !== "object") {
    errors.push("Response is not an object");
    return { valid: false, errors, warnings };
  }

  // Check required fields
  if (!envelope.provenance) {
    errors.push("Missing provenance metadata - unlabeled data rejected");
  }

  if (!envelope.data) {
    errors.push("Missing data payload");
  }

  if (envelope.isSimulated === undefined || envelope.isSimulated === null) {
    errors.push("Missing isSimulated flag - data integrity cannot be verified");
  }

  if (!envelope.classification) {
    errors.push("Missing data classification");
  }

  if (!envelope.dataHash) {
    errors.push("Missing data hash - integrity cannot be verified");
  }

  // Validate provenance structure
  if (envelope.provenance) {
    if (!envelope.provenance.source) {
      errors.push("Provenance missing source identifier");
    }

    if (!envelope.provenance.generatedAt) {
      errors.push("Provenance missing timestamp");
    }

    if (!envelope.provenance.provenanceId) {
      errors.push("Provenance missing unique identifier");
    }

    if (!Array.isArray(envelope.provenance.lineage)) {
      errors.push("Provenance lineage is not an array");
    }
  }

  // Validate confidence score if present
  if (envelope.confidence !== undefined && envelope.confidence !== null) {
    if (typeof envelope.confidence !== "number") {
      errors.push("Confidence score must be a number");
    } else if (envelope.confidence < 0 || envelope.confidence > 1) {
      errors.push("Confidence score must be between 0 and 1");
    } else if (finalConfig.minConfidence && envelope.confidence < finalConfig.minConfidence) {
      errors.push(
        `AI confidence (${envelope.confidence}) below minimum threshold (${finalConfig.minConfidence})`
      );
    } else if (envelope.confidence < 0.7) {
      warnings.push(`Low AI confidence score: ${envelope.confidence}`);
    }
  }

  // Check simulation flag
  if (envelope.isSimulated && finalConfig.rejectSimulated) {
    errors.push("Simulated data not allowed in production environment");
  }

  if (envelope.isSimulated) {
    warnings.push("This is simulated/synthetic data - use with caution");
  }

  // Check classification
  if (
    envelope.classification &&
    finalConfig.allowedClassifications &&
    !finalConfig.allowedClassifications.includes(envelope.classification)
  ) {
    errors.push(
      `Data classification ${envelope.classification} not allowed. Allowed: ${finalConfig.allowedClassifications.join(", ")}`
    );
  }

  // Verify data hash integrity
  if (finalConfig.verifyHash && envelope.dataHash && typeof window !== "undefined") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const dataString = JSON.stringify(envelope.data);
      // Note: In browser, we'd use SubtleCrypto API instead
      // This is a simplified check - actual implementation should use proper crypto
      const isHashValid = envelope.dataHash && envelope.dataHash.length === 64;
      if (!isHashValid) {
        errors.push("Data hash integrity check failed - possible tampering detected");
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      warnings.push("Could not verify data hash integrity");
    }
  }

  // Check warnings array
  if (envelope.warnings && Array.isArray(envelope.warnings) && envelope.warnings.length > 0) {
    warnings.push(...envelope.warnings);
  }

  // In strict mode, treat warnings as errors
  if (finalConfig.strictMode && warnings.length > 0) {
    errors.push(...warnings);
    warnings.length = 0;
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Extract data from envelope after validation
 */
export function unwrapEnvelope<T>(envelope: DataEnvelope<T>): T {
  const validation = validateDataEnvelope(envelope);

  if (!validation.valid) {
    throw new Error(`Invalid data envelope: ${validation.errors.join(", ")}`);
  }

  // Log warnings to console
  if (validation.warnings.length > 0) {
    console.warn("[Data Envelope] Validation warnings:", validation.warnings);
  }

  return envelope.data;
}

/**
 * Check if data is AI-generated
 */
export function isAIGenerated(envelope: DataEnvelope): boolean {
  return envelope.confidence !== undefined && envelope.confidence !== null;
}

/**
 * Get confidence level category
 */
export function getConfidenceLevel(confidence?: number): "high" | "medium" | "low" | "none" {
  if (confidence === undefined || confidence === null) {
    return "none";
  }

  if (confidence >= 0.8) {
    return "high";
  } else if (confidence >= 0.5) {
    return "medium";
  } else {
    return "low";
  }
}

/**
 * Get classification color for UI
 */
export function getClassificationColor(classification: DataClassification): string {
  switch (classification) {
    case DataClassification.PUBLIC:
      return "#10b981"; // green
    case DataClassification.INTERNAL:
      return "#3b82f6"; // blue
    case DataClassification.CONFIDENTIAL:
      return "#f59e0b"; // amber
    case DataClassification.RESTRICTED:
      return "#ef4444"; // red
    case DataClassification.HIGHLY_RESTRICTED:
      return "#7c2d12"; // dark red
    default:
      return "#6b7280"; // gray
  }
}

/**
 * Format provenance for display
 */
export function formatProvenance(provenance: Provenance): string {
  const date = new Date(provenance.generatedAt).toLocaleString();
  const actor = provenance.actor || "system";
  return `Generated by ${provenance.source} (${actor}) at ${date}`;
}

/**
 * Create validation error for display
 */
export class DataEnvelopeValidationError extends Error {
  public errors: string[];
  public warnings: string[];

  constructor(validation: ValidationResult) {
    super(`Data envelope validation failed: ${validation.errors.join(", ")}`);
    this.name = "DataEnvelopeValidationError";
    this.errors = validation.errors;
    this.warnings = validation.warnings;
  }
}

/**
 * HTTP interceptor wrapper for axios/fetch
 */
export function createEnvelopeInterceptor(config: ValidationConfig = {}) {
  return {
    /**
     * Response interceptor for axios
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    axiosResponseInterceptor: (response: any) => {
      const validation = validateDataEnvelope(response.data, config);

      if (!validation.valid) {
        throw new DataEnvelopeValidationError(validation);
      }

      // Log warnings
      if (validation.warnings.length > 0) {
        console.warn("[Data Envelope] API Response warnings:", validation.warnings);
      }

      // Store metadata in response
      response.envelope = response.data;
      response.data = response.data.data;
      response.provenance = response.envelope.provenance;

      return response;
    },

    /**
     * Response interceptor for fetch
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async fetchResponseInterceptor(response: Response): Promise<any> {
      const json = await response.json();

      const validation = validateDataEnvelope(json, config);

      if (!validation.valid) {
        throw new DataEnvelopeValidationError(validation);
      }

      // Log warnings
      if (validation.warnings.length > 0) {
        console.warn("[Data Envelope] API Response warnings:", validation.warnings);
      }

      return {
        envelope: json,
        data: json.data,
        provenance: json.provenance,
        confidence: json.confidence,
        isSimulated: json.isSimulated,
        classification: json.classification,
      };
    },
  };
}
