export type UUID = string;
export interface Transform {
    name: string;
    params: Record<string, any>;
    outHash: string;
}
export interface MediaAttestation {
    captureSig: string;
    exifHash: string;
    sensorFingerprint?: string;
    transformChain: Transform[];
}
export interface StepCommit {
    id: string;
    tool: string;
    startedAt: string;
    endedAt: string;
    inputHash: string;
    outputHash: string;
    policyHash: string;
    modelHash?: string;
    media?: MediaAttestation;
    contradiction?: {
        attesterId: string;
        proof: string;
    };
}
export interface WalletManifest {
    runId: UUID;
    caseId: UUID;
    createdAt: string;
    merkleRoot: string;
    signer: string;
    algo: 'RSA-SHA256';
    signature: string;
}
export interface InclusionProof {
    stepId: string;
    leaf: string;
    path: {
        dir: 'L' | 'R';
        hash: string;
    }[];
}
export interface SelectiveDisclosureBundle {
    manifest: WalletManifest;
    disclosedSteps: StepCommit[];
    proofs: InclusionProof[];
}
//# sourceMappingURL=types.d.ts.map