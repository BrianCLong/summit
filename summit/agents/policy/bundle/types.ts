export type BundleEnv = "dev" | "test" | "prod";

export interface PolicySignature {
  type: "sha256";
  signer: string;
  sig: string;
}

export interface PolicyBundle {
  bundle_version: 1;
  policy_version: number;
  created_at: string;
  env: BundleEnv;
  policy_sha256: string;
  skills_sha256: string;
  policy_path: string;
  skills_path: string;
  approvals: string[];
  signatures: PolicySignature[];
}

export interface BundleVerificationResult {
  ok: boolean;
  errors: string[];
}
