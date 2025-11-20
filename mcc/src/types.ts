export type RiskLevel = 'low' | 'medium' | 'high';

export interface Metric {
  name: string;
  value: number;
  unit?: string;
  description?: string;
}

export interface IntendedUse {
  summary: string;
  supportedPurposes: string[];
  usageRestrictions?: string[];
}

export interface DataLineageEntry {
  id: string;
  description?: string;
}

export interface RiskFlag {
  id: string;
  level: RiskLevel;
  description?: string;
  mitigation?: string;
}

export interface RiskSection {
  flags: RiskFlag[];
  outOfScopePurposes: string[];
  notes?: string;
}

export interface ModelCardInput {
  modelId: string;
  version: string;
  owner: string;
  description: string;
  metrics: Metric[];
  intendedUse: IntendedUse;
  dataLineage: {
    datasets: DataLineageEntry[];
  };
  risk: RiskSection;
  references?: string[];
}

export interface SignatureBlock {
  algorithm: 'ed25519';
  publicKey: string;
  value: string;
}

export interface CompiledModelCard {
  metadata: {
    modelId: string;
    version: string;
    owner: string;
    compiledAt: string;
    sourceHash: string;
  };
  description: string;
  metrics: Metric[];
  intendedUse: IntendedUse;
  dataLineage: {
    datasets: DataLineageEntry[];
  };
  risk: RiskSection;
  enforcement: {
    allowedPurposes: string[];
    deniedPurposes: string[];
  };
  signature: SignatureBlock;
}

export interface CompileOptions {
  privateKeyPath: string;
  publicKeyPath?: string;
  now?: Date;
}

export interface CompileResult {
  card: CompiledModelCard;
  canonicalPayload: string;
}
