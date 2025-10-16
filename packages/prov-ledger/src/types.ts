export type UUID = string;

export interface MediaAttestation {
  captureSig: string; // device attestation
  exifHash: string;
  sensorFingerprint: string; // optional
  transformChain: {
    name: string;
    params: Record<string, any>;
    outHash: string;
  }[];
}

export interface KPWMediaStep extends StepCommit {
  media?: MediaAttestation; // present if media involved
  contradiction?: { attesterId: string; proof: string }; // optional slot
}

export interface StepCommit {
  id: string; // step id
  tool: string; // tool name used
  startedAt: string; // ISO
  endedAt: string; // ISO
  inputHash: string; // sha256(input payload)
  outputHash: string; // sha256(output payload)
  policyHash: string; // sha256(policy snapshot)
  modelHash?: string; // sha256(model id + version + prompt)
}

export interface WalletManifest {
  runId: UUID;
  caseId: UUID;
  createdAt: string;
  merkleRoot: string; // hex
  // opaque, signed by ledger service
  signature: string; // base64
  signer: string;
  algo: 'RSA-SHA256';
}

export interface InclusionProof {
  stepId: string;
  leaf: string; // hex of leaf hash
  path: { dir: 'L' | 'R'; hash: string }[]; // sibling path to root
}

export interface SelectiveDisclosureBundle {
  manifest: WalletManifest;
  disclosedSteps: StepCommit[]; // cleartext metadata for revealed steps
  proofs: InclusionProof[]; // Merkle proofs for revealed leaves
}
