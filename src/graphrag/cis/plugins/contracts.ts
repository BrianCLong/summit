/**
 * DisinfoShield Plug-in Contracts
 *
 * Defines the boundary between Summit Control Plane and external vendor signals.
 *
 * @module cis/plugins/contracts
 */

// Feature Flags
export const CIS_VENDOR_DETECTORS = process.env.CIS_VENDOR_DETECTORS === 'true';
export const CIS_TRUTHSCAN_ENABLED = process.env.CIS_TRUTHSCAN_ENABLED === 'true';
export const CIS_BLACKBIRD_ENABLED = process.env.CIS_BLACKBIRD_ENABLED === 'true';

/**
 * Base interface for all CIS signals to ensure multi-tenancy and provenance.
 */
export interface BaseSignal {
  /** Unique tenant identifier for isolation */
  tenant_id: string;
  /** Name of the signal provider (e.g., 'truthscan', 'blackbird', 'internal') */
  provider: string;
  /** External reference ID from the provider (for audit/provenance) */
  provider_ref: string;
  /** Timestamp when the signal was observed/ingested */
  observed_at: string; // ISO 8601
}

/**
 * Integrity signal representing an artifact-level judgment.
 * Corresponds to TruthScan-class outputs.
 */
export interface IntegritySignal extends BaseSignal {
  /** Hash of the artifact being analyzed */
  artifact_hash: string;
  /** Type of artifact (e.g., 'text', 'image', 'video', 'audio') */
  artifact_type: string;
  /** Integrity scores (0.0 to 1.0) */
  scores: {
    ai_generated: number;
    manipulated: number;
    spoof: number;
    [key: string]: number;
  };
  /** Explanations or reasoning for the scores */
  explanations?: string[];
}

/**
 * Narrative intelligence signal representing a cluster or topic risk.
 * Corresponds to Blackbird-class outputs.
 */
export interface NarrativeIntel extends BaseSignal {
  /** Unique narrative identifier (from provider or generated) */
  narrative_id: string;
  /** Topic or claim summary */
  topic: string;
  /** Associated entities involved in the narrative */
  entities: string[];
  /** References to actors or cohorts driving the narrative */
  actor_refs: string[];
  /** Channels where the narrative is observed */
  channels: string[];
  /** Risk scores for the narrative */
  risk_scores: {
    toxicity: number;
    manipulation: number;
    automation: number;
    growth: number;
    [key: string]: number;
  };
}

/**
 * Interface for an Integrity Signal Provider adapter.
 */
export interface IntegritySignalProvider {
  name: string;
  /**
   * Process a raw payload from the vendor and return a normalized IntegritySignal.
   * Must validate tenant isolation and provenance.
   */
  processSignal(payload: unknown, tenantId: string): Promise<IntegritySignal>;
}

/**
 * Interface for a Narrative Intelligence Provider adapter.
 */
export interface NarrativeIntelProvider {
  name: string;
  /**
   * Process a raw payload from the vendor and return a normalized NarrativeIntel.
   * Must validate tenant isolation and provenance.
   */
  processSignal(payload: unknown, tenantId: string): Promise<NarrativeIntel>;
}
