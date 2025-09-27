export type SupportedSchemaType = 'avro' | 'json' | 'parquet';

export interface FieldSemantics {
  description?: string;
  pii?: boolean;
  required?: boolean;
  enums?: string[];
}

export interface DataContract {
  name: string;
  version: string;
  schemaType: SupportedSchemaType;
  schema: unknown;
  semantics?: {
    summary?: string;
    fields?: Record<string, FieldSemantics>;
  };
  serviceLevel?: {
    freshnessMinutes?: number;
    availabilityPercent?: number;
    qualityScoreThreshold?: number;
  };
  consumers?: Array<{
    name: string;
    expectations?: {
      allowedLatencyMinutes?: number;
      requiredFields?: string[];
    };
  }>;
  goldenSamples?: unknown[];
}

export interface NormalizedField {
  name: string;
  type: string;
  optional: boolean;
}

export interface ContractDiff {
  field?: string;
  severity: 'breaking' | 'non-breaking' | 'info';
  category: 'schema' | 'semantics' | 'sla';
  message: string;
  remediation: string;
}

export interface CompilationArtifacts {
  providerTestsPath: string;
  consumerTestsPath: string;
  githubActionPath: string;
  htmlReportPath: string;
  goldenSamplePath?: string;
  violations: ContractDiff[];
}
