export type Dialect = 'bigquery' | 'snowflake' | 'postgres';

export interface GrainColumn {
  column: string;
  type: string;
  description?: string;
}

export interface Filter {
  column: string;
  operator: '=' | '!=' | '<' | '>' | '<=' | '>=' | 'IN';
  value: string | number | boolean | (string | number | boolean)[];
}

export interface Measure {
  name: string;
  expression: string;
  type: string;
  description?: string;
}

export interface SqlGeneratorOverride {
  view?: string;
  udf?: string;
}

export interface MetricTestCase {
  name: string;
  query: string;
  goldenOutputPath?: string;
}

export interface MetricSpec {
  name: string;
  version: number;
  description?: string;
  grain: GrainColumn[];
  source: string;
  filters?: Filter[];
  measures: Measure[];
  sqlGenerators?: Partial<Record<Dialect, SqlGeneratorOverride>>;
  tests?: MetricTestCase[];
  owners: string[];
}

export interface CompiledArtifactSet {
  view: string;
  udf: string;
}

export interface RegistryOptions {
  specsRoot?: string;
  outputRoot?: string;
  goldenRoot?: string;
}

export interface SpecRecord {
  spec: MetricSpec;
  absolutePath: string;
  signature: string;
}
