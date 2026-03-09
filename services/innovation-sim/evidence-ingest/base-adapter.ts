/**
 * Base Evidence Adapter Interface
 *
 * All evidence adapters must implement this interface to normalize
 * external data sources into EvidenceEvent format.
 */

import type { EvidenceRef, EvidenceType } from "../interfaces/evidence.js";

/**
 * Evidence Event: Normalized output from all adapters
 */
export interface EvidenceEvent {
  /**
   * Unique event ID
   */
  id: string;

  /**
   * Evidence type
   */
  type: EvidenceType;

  /**
   * Human-readable source
   */
  source: string;

  /**
   * Optional URI for retrieval
   */
  uri?: string;

  /**
   * When this evidence was observed
   */
  observedAt: string;

  /**
   * Confidence score (0.0-1.0)
   */
  confidence: number;

  /**
   * What this evidence asserts (relationships, attributes, etc.)
   */
  assertions: EvidenceAssertion[];

  /**
   * Raw metadata from source
   */
  rawMetadata?: Record<string, unknown>;
}

/**
 * Evidence Assertion: What the evidence claims
 */
export interface EvidenceAssertion {
  /**
   * Assertion type
   */
  type: "node_exists" | "edge_exists" | "attribute_value" | "temporal_event";

  /**
   * Subject of assertion (node ID, edge ID, etc.)
   */
  subject: string;

  /**
   * Predicate (relationship type, attribute name, etc.)
   */
  predicate?: string;

  /**
   * Object (target node, attribute value, etc.)
   */
  object?: string | number | boolean | Record<string, unknown>;

  /**
   * Confidence modifier for this specific assertion (0.0-1.0)
   */
  confidence?: number;
}

/**
 * Adapter Configuration
 */
export interface AdapterConfig {
  /**
   * Adapter name
   */
  name: string;

  /**
   * Evidence type this adapter produces
   */
  evidenceType: EvidenceType;

  /**
   * Optional API keys, credentials, etc.
   */
  credentials?: Record<string, string>;

  /**
   * Optional rate limiting settings
   */
  rateLimit?: {
    requestsPerSecond: number;
    requestsPerHour: number;
  };

  /**
   * Optional timeout settings
   */
  timeout?: {
    requestTimeoutMs: number;
    maxRetries: number;
  };
}

/**
 * Base Evidence Adapter
 *
 * Abstract class that all adapters extend
 */
export abstract class BaseEvidenceAdapter {
  protected config: AdapterConfig;

  constructor(config: AdapterConfig) {
    this.config = config;
  }

  /**
   * Fetch evidence from source
   *
   * @param query - Adapter-specific query parameters
   * @returns Array of evidence events
   */
  abstract fetch(query: Record<string, unknown>): Promise<EvidenceEvent[]>;

  /**
   * Convert evidence event to evidence reference
   *
   * Helper method to convert normalized EvidenceEvent to EvidenceRef
   * for use in graph nodes/edges.
   */
  toEvidenceRef(event: EvidenceEvent): EvidenceRef {
    return {
      id: event.id,
      type: event.type,
      source: event.source,
      uri: event.uri,
      observedAt: event.observedAt,
      confidence: event.confidence,
      metadata: event.rawMetadata,
    };
  }

  /**
   * Validate evidence event
   */
  protected validateEvent(event: EvidenceEvent): boolean {
    if (!event.id || event.id.length === 0) return false;
    if (!event.source || event.source.length === 0) return false;
    if (!event.observedAt || event.observedAt.length === 0) return false;
    if (event.confidence < 0.0 || event.confidence > 1.0) return false;
    if (!event.assertions || event.assertions.length === 0) return false;
    return true;
  }

  /**
   * Get adapter name
   */
  getName(): string {
    return this.config.name;
  }

  /**
   * Get evidence type
   */
  getEvidenceType(): EvidenceType {
    return this.config.evidenceType;
  }
}

/**
 * Batch processing result
 */
export interface BatchResult {
  /**
   * Successfully processed events
   */
  success: EvidenceEvent[];

  /**
   * Failed events with errors
   */
  failed: Array<{
    query: Record<string, unknown>;
    error: string;
  }>;

  /**
   * Processing statistics
   */
  stats: {
    totalAttempted: number;
    totalSuccess: number;
    totalFailed: number;
    durationMs: number;
  };
}
