export interface ProvenanceMetadata {
  sourceSystem: string;
  sourceIdentifier: string;
  ingestJobId: string;
  ingestTimestamp: string;
  trustLevel: number;
  dataOwner: string;
}
