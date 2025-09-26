export type SourceType = 'csv' | 'json' | 'elasticsearch' | 'esri' | 'api';

export interface LicenseRestrictions {
  commercial_use: boolean;
  export_allowed: boolean;
  research_only: boolean;
  attribution_required: boolean;
  share_alike: boolean;
}

export interface CustomLicense {
  name: string;
  type: 'commercial' | 'open_source' | 'proprietary' | 'restricted';
  restrictions: LicenseRestrictions;
}

export interface DataSourceConfig {
  id?: string;
  name: string;
  description?: string;
  source_type: SourceType;
  source_config: Record<string, unknown>;
  license_template?: string;
  custom_license?: CustomLicense;
  tos_accepted: boolean;
  retention_period: number;
  geographic_restrictions: string[];
}

export interface FieldPreview {
  name: string;
  type: string;
  pii?: 'none' | 'low' | 'medium' | 'high' | 'critical';
  required?: boolean;
  example?: string;
}

export interface FieldMapping {
  id: string;
  sourceField: string;
  targetField: string;
  transformation?: string;
  required?: boolean;
}

export interface SchemaMappingState {
  sourceSample: FieldPreview[];
  targetSchema: FieldPreview[];
  mappings: FieldMapping[];
  autoMappedFields: string[];
}

export type ValidationStatus = 'idle' | 'pending' | 'passed' | 'failed';

export interface ValidationIssue {
  id: string;
  field?: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  suggestion?: string;
}

export interface ValidationState {
  status: ValidationStatus;
  issues: ValidationIssue[];
  lastRun?: string;
}

export interface IngestWizardState {
  currentStep: number;
  dataSource: Partial<DataSourceConfig>;
  schemaMapping: SchemaMappingState;
  validation: ValidationState;
}

export interface WizardCompletion {
  dataSource: DataSourceConfig;
  schemaMapping: SchemaMappingState;
  validation: ValidationState;
}
