export interface BundleCase {
  id: string;
  title: string;
  status: string;
  description?: string;
  compartment?: string;
  policyLabels?: string[];
  metadata?: Record<string, unknown>;
}

export interface BundleEvidence {
  id: string;
  caseId: string;
  type: string;
  uri: string;
  sha256?: string;
  size?: number;
}

export interface BundleNote {
  id: string;
  caseId: string;
  author?: string;
  body: string;
  createdAt?: string;
}

export interface BundleGraphNode {
  id: string;
  caseId?: string;
  type: string;
  label: string;
  properties?: Record<string, unknown>;
}

export interface BundleGraphEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  properties?: Record<string, unknown>;
}

export interface BundleGraphSubset {
  nodes: BundleGraphNode[];
  edges: BundleGraphEdge[];
}

export interface CaseBundleStore {
  getCases(caseIds: string[]): Promise<BundleCase[]>;
  getEvidence(caseIds: string[]): Promise<BundleEvidence[]>;
  getNotes(caseIds: string[]): Promise<BundleNote[]>;
  getGraphSubset(caseIds: string[]): Promise<BundleGraphSubset>;
}

export interface CaseBundleManifestEntry {
  id: string;
  path: string;
  hash: string;
  caseId?: string;
  type?: string;
  label?: string;
}

export interface CaseBundleManifest {
  version: 'case-bundle-v1';
  generatedAt: string;
  bundleHash: string;
  cases: CaseBundleManifestEntry[];
  evidence: CaseBundleManifestEntry[];
  notes: CaseBundleManifestEntry[];
  graph: {
    nodes: CaseBundleManifestEntry[];
    edges: CaseBundleManifestEntry[];
  };
}

export interface CaseBundleExportOptions {
  include?: Partial<{
    evidence: boolean;
    graph: boolean;
    notes: boolean;
  }>;
  targetDir?: string;
  format?: 'directory' | 'zip';
  generatedAt?: string;
}

export interface CaseBundleExportResult {
  bundlePath: string;
  archivePath?: string;
  manifest: CaseBundleManifest;
}

export interface CaseBundleImportOptions {
  include?: Partial<{
    evidence: boolean;
    graph: boolean;
    notes: boolean;
  }>;
  preserveIds?: boolean;
  namespace?: string;
}

export interface MappingEntry {
  oldId: string;
  newId: string;
  type: string;
  caseId?: string;
}

export interface CaseBundleMappingReport {
  generatedAt: string;
  sourceBundleHash: string;
  mapping: {
    cases: MappingEntry[];
    evidence: MappingEntry[];
    notes: MappingEntry[];
    graphNodes: MappingEntry[];
    graphEdges: MappingEntry[];
  };
  warnings: string[];
  skipped: string[];
}

export interface CaseBundleImportResult {
  manifest: CaseBundleManifest;
  bundlePath: string;
  mapping: CaseBundleMappingReport;
  mappingPath: string;
}
