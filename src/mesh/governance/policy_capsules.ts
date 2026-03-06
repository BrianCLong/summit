export enum PrivacyTier {
  PUBLIC = "PUBLIC",
  METADATA = "METADATA",
  RESTRICTED = "RESTRICTED",
  PRIVILEGED = "PRIVILEGED"
}

export type MeshTileID =
  | "ATG"
  | "DISINFO"
  | "ITT"
  | "SCEL"
  | "IEA"
  | "AEDG"
  | "CES"
  | "CPEM"
  | "REN"
  | "KERNEL";

export interface MeshPolicyScope {
  tileId: MeshTileID;
  privacyTier: PrivacyTier;
  allowedInputs: string[]; // e.g., ["metadata", "hash"]
  allowedOutputs: string[]; // e.g., ["signals", "tickets"]
  requiredReviewers: string[]; // e.g., ["security-leadership", "legal"]
}

export interface PolicyCapsule {
  id: string;
  scope: MeshPolicyScope;
  constraints: {
    noRawContent: boolean;
    noOffensiveGuidance: boolean;
    auditLevel: "standard" | "high" | "forensic";
  };
  version: string;
}

export const MESH_KERNEL_POLICY: PolicyCapsule = {
  id: "POL-MESH-KERNEL-V1",
  scope: {
    tileId: "KERNEL",
    privacyTier: PrivacyTier.METADATA,
    allowedInputs: ["metadata"],
    allowedOutputs: ["signals"],
    requiredReviewers: ["platform-eng"]
  },
  constraints: {
    noRawContent: true,
    noOffensiveGuidance: true,
    auditLevel: "standard"
  },
  version: "1.0.0"
};
