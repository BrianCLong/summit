export interface ArtifactRef {
  artifact_id: string;
  type: string;
  sha256: string;
  uri?: string;
}

export interface ProvenanceBundle {
  artifacts: ArtifactRef[];
}
