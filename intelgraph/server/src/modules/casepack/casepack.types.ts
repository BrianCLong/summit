export interface CasePackManifest {
  pack_id: string;
  case_id: string;
  tenant_id: string;
  revision: number;
  created_at: string;
  scope: CasePackScope;
  inventory: CasePackInventory;
  budgets: CasePackBudgets;
  actuals: CasePackActuals;
  provenance: CasePackProvenance;
  signature: CasePackSignature;
}

export interface CasePackScope {
  selectors: Array<{
    type: string;
    ids?: string[];
    time_range?: [string, string];
    tags?: string[];
  }>;
}

export interface CasePackInventory {
  objects: CasePackFile[];
  attachments: CasePackFile[];
}

export interface CasePackFile {
  path: string;
  sha256: string;
  bytes: number;
}

export interface CasePackBudgets {
  total_bytes: number;
  max_objects: number;
}

export interface CasePackActuals {
  total_bytes: number;
  object_counts: Record<string, number>;
}

export interface CasePackProvenance {
  git_sha: string;
  build_id: string;
}

export interface CasePackSignature {
  algorithm: string;
  key_id: string;
  canonicalization: "JCS";
}
