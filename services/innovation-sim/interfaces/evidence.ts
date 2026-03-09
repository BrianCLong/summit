/**
 * Evidence Reference Types
 *
 * Every claim in the Innovation Simulation system must be backed by evidence.
 * This module defines the evidence reference schema used throughout the graph.
 */

export type EvidenceType =
  | "repo"              // Git repository artifacts (commits, PRs, issues)
  | "paper"             // Research papers, preprints, technical reports
  | "funding"           // VC rounds, grants, acquisitions
  | "job-posting"       // Hiring signals (roles, skills, team sizes)
  | "standard"          // Standards bodies, RFCs, specifications
  | "market-signal"     // Product launches, adoption metrics, usage data
  | "manual";           // Human-curated observations

export interface EvidenceRef {
  id: string;
  type: EvidenceType;
  source: string;
  uri?: string;
  observedAt: string;
  confidence: number;
  metadata?: Record<string, unknown>;
}

export interface EvidenceBundle {
  refs: EvidenceRef[];
  aggregatedConfidence: number;
  sourceCount: number;
  firstObservedAt: string;
  lastObservedAt: string;
}

export function isValidEvidence(ref: EvidenceRef): boolean {
  return (
    ref.confidence >= 0.0 &&
    ref.confidence <= 1.0 &&
    ref.id.length > 0 &&
    ref.source.length > 0 &&
    ref.observedAt.length > 0
  );
}

export function aggregateConfidence(refs: EvidenceRef[]): number {
  if (refs.length === 0) return 0.0;
  const product = refs.reduce((acc, ref) => acc * (1 - ref.confidence), 1.0);
  return Math.min(1.0, 1.0 - product);
}

export function buildEvidenceBundle(refs: EvidenceRef[]): EvidenceBundle {
  if (refs.length === 0) {
    throw new Error("Evidence bundle must contain at least one reference");
  }
  const uniqueSources = new Set(refs.map(r => r.source));
  const timestamps = refs.map(r => r.observedAt).sort();
  return {
    refs,
    aggregatedConfidence: aggregateConfidence(refs),
    sourceCount: uniqueSources.size,
    firstObservedAt: timestamps[0],
    lastObservedAt: timestamps[timestamps.length - 1],
  };
}
