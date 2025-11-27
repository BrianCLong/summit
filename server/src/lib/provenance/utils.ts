import { ProvenanceMetadata } from './types';

export function createProvenance(
  sourceSystem: string,
  sourceIdentifier: string,
  ingestJobId: string,
  trustLevel: number,
  dataOwner: string
): ProvenanceMetadata {
  return {
    sourceSystem,
    sourceIdentifier,
    ingestJobId,
    ingestTimestamp: new Date().toISOString(),
    trustLevel,
    dataOwner,
  };
}

export function attachProvenance<T extends object>(
  record: T,
  provenance: ProvenanceMetadata
): T & { provenance: ProvenanceMetadata } {
  return { ...record, provenance };
}
