export interface ProvenanceReceipt {
  runId: string;
  inputsHash: string;
  codeDigest: string;
  outputsHash: string;
  signer?: string;
}
