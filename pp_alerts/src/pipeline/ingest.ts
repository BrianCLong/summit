import { validate } from '../policy/no_plaintext_sensitive';

export interface IngestPayload {
  topology: any; // GraphTopology
  shares: any; // SecretFeatureShares
}

export function ingest(payload: IngestPayload): boolean {
  // 1. Governance check
  validate(payload.topology);
  // shares are technically just bytes, but we check structure
  validate(payload.shares);

  // 2. Schema validation (mocked for now, real system uses schema validator)
  if (!payload.topology.nodes || !payload.topology.edges) {
    throw new Error("Invalid topology");
  }
  if (!payload.shares.shares) {
    throw new Error("Invalid shares");
  }

  // 3. Ingest logic (mocked)
  // console.log("Ingesting privacy-preserving graph...");
  return true;
}
