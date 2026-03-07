export type VerificationIssueCode =
  | "MISSING_MANIFEST"
  | "SCHEMA_INVALID"
  | "MISSING_FILE"
  | "HASH_MISMATCH"
  | "PATH_TRAVERSAL"
  | "TRANSFORM_BROKEN"
  | "EVIDENCE_MISSING"
  | "SIGNATURE_MISSING"
  | "SIGNATURE_INVALID";

export interface VerificationIssue {
  code: VerificationIssueCode;
  message: string;
  path?: string;
  details?: Record<string, unknown>;
}

export interface VerificationReport {
  bundlePath: string;
  manifestPath: string;
  manifestVersion?: string;
  valid: boolean;
  issues: VerificationIssue[];
  filesChecked: number;
  transformsChecked: number;
  signature?: ManifestSignatureReport;
  disclosure?: DisclosureSummary;
}

export interface ManifestFileEntry {
  id: string;
  path: string;
  mediaType?: string;
  role?: string;
  sha256: string;
  transforms?: string[];
  evidence?: string[];
}

export interface ManifestTransform {
  id: string;
  description?: string;
  step: number;
  inputId: string;
  outputId: string;
  evidenceIds?: string[];
}

export interface Manifest {
  manifestVersion: string;
  bundleId?: string;
  createdAt: string;
  documents: ManifestFileEntry[];
  exhibits?: ManifestFileEntry[];
  evidence?: ManifestFileEntry[];
  transforms?: ManifestTransform[];
  disclosure?: DisclosureMetadata;
  signature?: ManifestSignature;
}

export interface DisclosureRedaction {
  field: string;
  path: string;
  reason: string;
  policyId?: string;
  appliedBy?: string;
  appliedAt: string;
}

export interface DisclosureAudiencePolicy {
  policyId: string;
  label: string;
  decision?: "allow" | "deny" | "conditional";
}

export interface DisclosureLicense {
  id: string;
  name: string;
  url?: string;
  notes?: string;
}

export interface DisclosureMetadata {
  audience: DisclosureAudiencePolicy;
  redactions: DisclosureRedaction[];
  license: DisclosureLicense;
  redactionSummary?: {
    total: number;
    fields: string[];
  };
}

export interface ManifestSignature {
  algorithm: "ed25519";
  keyId: string;
  publicKey: string;
  signature: string;
  signedAt: string;
}

export interface ManifestSignatureFile {
  manifestHash: string;
  signature: ManifestSignature;
}

export interface ManifestSignatureReport {
  valid: boolean;
  keyId?: string;
  algorithm?: string;
  signedAt?: string;
  manifestHash?: string;
  reason?: string;
}

export interface DisclosureSummary {
  licenseId?: string;
  audiencePolicyId?: string;
  redactionCount: number;
  redactedFields: string[];
}
