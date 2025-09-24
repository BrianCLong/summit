export type IngestFormat = 'csv' | 'json';

export interface CanonicalField {
  id: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  required?: boolean;
  description: string;
  piiCategory?: string;
  policies?: string[];
}

export interface CanonicalEntity {
  id: string;
  label: string;
  description: string;
  fields: CanonicalField[];
}

export interface FieldLineage {
  sourceField: string;
  transforms: string[];
  policyTags: string[];
}

export interface PIIFlag {
  field: string;
  severity: 'none' | 'moderate' | 'restricted';
  reasons: string[];
  category?: string;
  blocked?: boolean;
  presets: Array<{ id: string; label: string; description: string }>;
}

export interface FieldAnalysis {
  sourceField: string;
  inferredType: 'string' | 'number' | 'boolean' | 'date';
  confidence: number;
  sampleValues: string[];
  recommendedCanonical?: string;
  pii?: PIIFlag | null;
  blocked: boolean;
  blockedReasons: string[];
  lineage: FieldLineage;
}

export interface DataQualitySummary {
  rowCount: number;
  averageCompleteness: number;
  emptyFieldRatios: Array<{ field: string; emptyPercentage: number }>;
  issues: string[];
}

export interface AnalyzeResult {
  entity: CanonicalEntity;
  samplePreview: Record<string, unknown>[];
  totalRows: number;
  fieldAnalyses: FieldAnalysis[];
  suggestedMappings: Record<string, string>;
  requiredFieldIssues: string[];
  piiFlags: PIIFlag[];
  redactionPresets: Array<{ id: string; label: string; description: string }>;
  estimatedCompletionMinutes: number;
  licenses: LicenseDefinition[];
  coverage: {
    required: {
      total: number;
      satisfied: number;
      missing: string[];
    };
    mappedFields: number;
    totalFields: number;
  };
  confidenceScore: number;
  warnings: string[];
  mappingConfidence: {
    high: number;
    medium: number;
    low: number;
  };
  unmappedSourceFields: Array<{ field: string; reason: string }>;
  dataQuality: DataQualitySummary;
  analysisDurationMs: number;
}

export interface WizardMetadata {
  entities: Array<{
    id: string;
    label: string;
    description: string;
    requiredFields: string[];
  }>;
  redactionPresets: Array<{ id: string; label: string; description: string }>;
  licenses: LicenseDefinition[];
}

export interface TransformSpecField {
  canonicalField: string;
  sourceField: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  lineage: FieldLineage;
  pii?: {
    severity: 'none' | 'moderate' | 'restricted';
    reasons: string[];
    redaction?: string | 'none';
  };
}

export interface TransformSpec {
  version: string;
  createdAt: string;
  format: IngestFormat;
  entity: string;
  fields: TransformSpecField[];
  policies: { license?: string };
  notes: {
    requiredFieldIssues: string[];
    warnings: string[];
  };
}

export interface BuildSpecPayload {
  sample: string | Record<string, unknown>[];
  format: IngestFormat;
  entityId: string;
  mappings: Record<string, string>;
  piiDecisions?: Record<string, { preset: string }>;
  licenseId?: string;
}

export interface DryRunPayload extends BuildSpecPayload {}

export interface DryRunResponse {
  spec: TransformSpec;
  previewRows: Record<string, unknown>[];
}

export interface LicenseDefinition {
  id: string;
  label: string;
  allowsRestrictedPII?: boolean;
  requiresAcceptance?: boolean;
  notes: string;
}

export interface LicenseCheckPayload {
  licenseId: string;
  accepted: boolean;
  piiFlags: PIIFlag[];
}

export interface LicenseResponse {
  licenses?: LicenseDefinition[];
  allowed?: boolean;
  issues?: string[];
  license?: LicenseDefinition;
}

export interface WizardState {
  format: IngestFormat;
  entityId: string;
  sample?: string | Record<string, unknown>[];
  analysis?: AnalyzeResult;
  mappings: Record<string, string>;
  piiDecisions: Record<string, { preset: string }>;
  licenseId?: string;
  acceptedTerms: boolean;
  transformSpec?: TransformSpec;
  dryRun?: DryRunResponse;
  sampleName?: string;
  sampleSource?: 'upload' | 'paste';
}
