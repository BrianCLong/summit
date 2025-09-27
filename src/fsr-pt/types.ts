export type JsonSchema = Record<string, unknown>;

export interface PolicyTags {
  sensitivity: string;
  residency: string;
  retentionClass: string;
}

export interface SchemaMetadata {
  silo: string;
  name: string;
  version: string;
  policyTags: PolicyTags;
  schema: JsonSchema;
  registeredAt: Date;
}

export interface PropertyChange {
  property: string;
  previous?: string;
  current?: string;
  changeType: 'added' | 'removed' | 'type-changed' | 'required-added' | 'required-removed';
}

export interface CompatibilityReport {
  compatible: boolean;
  breakingChanges: string[];
  nonBreakingChanges: string[];
}

export interface TagChange {
  tag: keyof PolicyTags;
  previous: string;
  current: string;
  impact: string;
}

export interface TagDiffReport {
  hasChanges: boolean;
  changes: TagChange[];
  summary: string;
}

export interface SchemaDiffReport {
  propertyChanges: PropertyChange[];
  tagDiff: TagDiffReport;
  impactSummary: string[];
}

export interface RegistrationResult {
  metadata: SchemaMetadata;
  compatibility: CompatibilityReport;
  diff: SchemaDiffReport;
  isBreakingChange: boolean;
}

export interface SchemaHistoryEntry extends SchemaMetadata {}
