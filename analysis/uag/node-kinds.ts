// analysis/uag/node-kinds.ts
export const NodeKinds = [
  "Artifact",
  "Component",
  "Dependency",
  "Build",
  "Attestation",
  "SBOM",
  "Policy",
  "Finding",
  "RuntimeTarget",
  "RemediationAction",
] as const;

export type NodeKind = (typeof NodeKinds)[number];
