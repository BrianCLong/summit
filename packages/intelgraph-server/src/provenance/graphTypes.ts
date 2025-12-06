// packages/intelgraph-server/src/provenance/graphTypes.ts

export type ProvenanceNodeType =
  | "commit"
  | "artifact"
  | "sbom"
  | "attestation"
  | "image"
  | "deployment";

export interface ProvenanceNodeBase {
  id: string;
  type: ProvenanceNodeType;
  timestamp: string; // ISO 8601
  metadata: Record<string, unknown>;
}

export interface CommitNode extends ProvenanceNodeBase {
  type: "commit";
  metadata: {
    repo: string;
    branch: string;
    sha: string;
    author: string;
    message: string;
  } & Record<string, unknown>;
}

export interface ArtifactNode extends ProvenanceNodeBase {
  type: "artifact";
  metadata: {
    path: string;
    sha256: string;
    buildId?: string;
  } & Record<string, unknown>;
}

export interface AttestationNode extends ProvenanceNodeBase {
  type: "attestation";
  metadata: {
    builder: string;
    runner: string;
    commit: string;
    repo: string;
    signatureVerified: boolean;
    signer?: string;
  } & Record<string, unknown>;
}

export interface SBOMPackageVuln {
  id: string;
  severity: "low" | "medium" | "high" | "critical";
  source?: string;
}

export interface SBOMPackage {
  name: string;
  version: string;
  license?: string;
  vuln?: SBOMPackageVuln;
}

export interface SBOMNode extends ProvenanceNodeBase {
  type: "sbom";
  metadata: {
    format: "cyclonedx";
    packages: SBOMPackage[];
  } & Record<string, unknown>;
}

export interface DeploymentNode extends ProvenanceNodeBase {
  type: "deployment";
  metadata: {
    environment: "dev" | "staging" | "prod" | string;
    version: string;
    commit: string;
  } & Record<string, unknown>;
}

export type ProvenanceNode =
  | CommitNode
  | ArtifactNode
  | SBOMNode
  | AttestationNode
  | DeploymentNode
  | ProvenanceNodeBase;

// --- EDGES ---

export type ProvenanceEdgeType =
  | "builds"
  | "produces"
  | "attests"
  | "contains"
  | "deploys"
  | "derived-from"
  | "validated-by";

export interface ProvenanceEdge {
  id: string;
  from: string;
  to: string;
  type: ProvenanceEdgeType;
  metadata?: Record<string, unknown>;
}

export interface ProvenanceGraph {
  nodes: ProvenanceNode[];
  edges: ProvenanceEdge[];
}
