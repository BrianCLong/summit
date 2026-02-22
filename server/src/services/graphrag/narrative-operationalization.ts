import type { EvidenceId } from './evidence-id.js';

export type NarrativeStateLabel =
  | 'seeded'
  | 'contested'
  | 'normalized'
  | 'exhausted';

export interface NarrativeArtifact {
  id: string;
  evidence: EvidenceId;
  canonicalTextHash: string;
  observedAtEventTime?: string;
}

export interface NarrativeClaim {
  id: string;
  evidence: EvidenceId;
  claimText: string;
}

export interface AssumptionNode {
  id: string;
  evidence: EvidenceId;
  assumptionText: string;
}

export interface NarrativeNode {
  id: string;
  evidence: EvidenceId;
  label?: string;
}

export interface NarrativeState {
  id: string;
  narrativeId: string;
  evidence: EvidenceId;
  state: NarrativeStateLabel;
}

export type GovernanceArtifactType =
  | 'audit'
  | 'oversight_body'
  | 'review'
  | 'policy';

export interface GovernanceArtifact {
  id: string;
  evidence: EvidenceId;
  refType: GovernanceArtifactType;
}
