export type NarrativeState =
  | 'seeded'
  | 'contested'
  | 'normalized'
  | 'exhausted'
  | 'absorbed';

export interface NarrativeArtifact {
  artifactId: string;
  observedAt: string;
  channel: string;
  text: string;
}

export interface TransformInfo {
  name: string;
  version: string;
}

export interface EvidenceIndexEntry {
  evdId: string;
  files: string[];
  sha256: Record<string, string>;
  transform: TransformInfo;
}

export interface EvidenceIndex {
  entries: EvidenceIndexEntry[];
}
