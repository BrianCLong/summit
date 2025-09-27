export interface DataClassDefinition {
  id: string;
  title?: string;
  description?: string;
  lawfulBases: string[];
  retentionMinimumDays: number;
  tags?: string[];
}

export interface TaxonomyDocument {
  version: string;
  jurisdiction?: string;
  issuedAt?: string;
  dataClasses: DataClassDefinition[];
}

export interface DataClassChange {
  id: string;
  type: 'added' | 'removed' | 'updated';
  before?: DataClassDefinition;
  after?: DataClassDefinition;
  delta?: {
    lawfulBases?: {
      before: string[];
      after: string[];
    };
    retentionMinimumDays?: {
      before: number;
      after: number;
    };
    description?: {
      before?: string;
      after?: string;
    };
  };
}

export interface TaxonomyDiff {
  added: DataClassDefinition[];
  removed: DataClassDefinition[];
  updated: DataClassChange[];
}

export interface HotspotMatch {
  file: string;
  line: number;
  excerpt: string;
}

export type HotspotScope = 'rules' | 'schemas' | 'prompts' | 'contracts';

export interface Hotspot {
  scope: HotspotScope;
  dataClassId: string;
  reason: string;
  matches: HotspotMatch[];
  suggestion: string;
}

export interface ImpactReport {
  generatedAt: string;
  baselineVersion: string;
  updatedVersion: string;
  jurisdiction?: string;
  diff: TaxonomyDiff;
  hotspots: Hotspot[];
  signature: ImpactSignature;
}

export interface ImpactSignature {
  algorithm: 'HS256';
  signature: string;
  keyId: string;
}

export interface LintOptions {
  baselinePath: string;
  updatedPath: string;
  repoRoot: string;
  signingKey: string;
  keyId: string;
}
