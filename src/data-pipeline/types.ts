export interface DataRecord {
  [key: string]: unknown;
}

export interface IngestionResult {
  source: string;
  records: DataRecord[];
  cursor?: string | number;
}

export interface IngestionSource {
  name: string;
  load(cursor?: string | number): Promise<IngestionResult>;
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
}

export interface QualityCheckResult {
  name: string;
  passed: boolean;
  details?: string;
}

export interface DataQualityReport {
  recordId?: string;
  results: QualityCheckResult[];
}

export interface TransformationContext {
  source: string;
  lineageId: string;
}

export type TransformationStep = (
  record: DataRecord,
  context: TransformationContext
) => DataRecord;

export interface DeadLetterEntry {
  record: DataRecord;
  reason: string;
  source: string;
  timestamp: number;
  lineageId: string;
}

export interface PipelineMetricsSnapshot {
  source: string;
  processed: number;
  succeeded: number;
  failed: number;
  deduplicated: number;
  filtered: number;
  qualityFailures: number;
  ingestionErrors: number;
}

export interface SchemaVersion {
  version: string;
  schema: Record<string, unknown>;
  description?: string;
}

export interface ScheduleTask {
  id: string;
  description: string;
  retries?: number;
  timeoutSeconds?: number;
}

export interface ScheduleSpec {
  executor: 'airflow' | 'temporal';
  schedule: string;
  tasks: ScheduleTask[];
  metadata?: Record<string, unknown>;
}
