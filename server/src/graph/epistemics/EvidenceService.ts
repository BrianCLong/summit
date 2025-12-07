import { EpistemicStatus, RiskClassification } from '../types.js';

export interface EvidenceBundle {
  id: string;
  claimId: string; // The ID of the node or edge this supports
  sourceUri?: string; // URI to the raw document/event
  timestamp: string;
  agentId?: string; // Who added this?
  reasoning?: string; // LLM explanation
  signature?: string; // Cryptographic hash
}

export interface EpistemicConflict {
  nodeId: string;
  property: string;
  values: {
    value: any;
    source: string;
    confidence: number;
    timestamp: string;
  }[];
}

export class EvidenceService {
  /**
   * Calculates a consolidated confidence score based on multiple evidence points.
   */
  calculateConfidence(evidence: EvidenceBundle[]): number {
    // Trivial implementation: basic decay or count-based
    if (evidence.length === 0) return 0.5; // Default uncertain
    // More evidence = higher confidence, asymptotically approaching 1.0
    return 1.0 - (0.5 / evidence.length);
  }

  /**
   * Resolves conflicts between sources.
   * Simple Last-Write-Wins or Trusted-Source-Wins logic.
   */
  resolveConflict(conflict: EpistemicConflict): any {
    // 1. Prefer 'maestro' or 'internal' sources
    const trusted = conflict.values.find(v => v.source === 'maestro');
    if (trusted) return trusted.value;

    // 2. Prefer highest confidence
    const sorted = [...conflict.values].sort((a, b) => b.confidence - a.confidence);
    if (sorted[0].confidence > sorted[1]?.confidence) return sorted[0].value;

    // 3. Prefer most recent
    const newest = [...conflict.values].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return newest[0].value;
  }
}
