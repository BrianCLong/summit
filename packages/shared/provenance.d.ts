export interface ProvenanceRecord {
  inputHash: string;
  algorithm: string;
  version: string;
  timestamp: string;
  signature: string;
}
export declare function createProvenanceRecord(
  data: Buffer | string,
  algorithm?: string,
  version?: string,
  timestamp?: string,
): ProvenanceRecord;
