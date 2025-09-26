import logger from '../../config/logger.js';

const lineageLogger = logger.child({ module: 'lineage-client' });
const DEFAULT_SERVICE_URL = 'http://localhost:7000';
const SERVICE_URL = process.env.LINEAGE_SERVICE_URL || DEFAULT_SERVICE_URL;

export interface DatasetDescriptor {
  namespace?: string;
  name: string;
  columns?: string[];
  metadata?: Record<string, any>;
}

export interface StartRunInput {
  jobName: string;
  jobType: string;
  tenantId?: string;
  namespace?: string;
  runId?: string;
  inputs?: DatasetDescriptor[];
  outputs?: DatasetDescriptor[];
  metadata?: Record<string, any>;
}

export interface LineageEventInput {
  stepId?: string;
  eventType: string;
  sourceDataset?: string;
  targetDataset?: string;
  sourceColumn?: string;
  targetColumn?: string;
  transformation?: string;
  targetSystem?: string;
  tenantId?: string;
  columns?: string[];
  metadata?: Record<string, any>;
}

async function postJson(path: string, body: Record<string, any>, timeoutMs = 1500) {
  const url = `${SERVICE_URL}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Lineage service responded with ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await response.json();
    }

    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function toServiceDatasets(datasets?: DatasetDescriptor[]) {
  return (datasets || []).map((dataset) => ({
    namespace: dataset.namespace || 'intelgraph',
    name: dataset.name,
    columns: dataset.columns || [],
    metadata: dataset.metadata || {},
  }));
}

export async function startLineageRun(input: StartRunInput): Promise<string | null> {
  try {
    const response = await postJson('/runs/start', {
      job_name: input.jobName,
      job_type: input.jobType,
      namespace: input.namespace || 'intelgraph',
      tenant_id: input.tenantId,
      run_id: input.runId,
      inputs: toServiceDatasets(input.inputs),
      outputs: toServiceDatasets(input.outputs),
      metadata: input.metadata || {},
    });

    const runId = response?.run_id || response?.runId;
    if (!runId) {
      lineageLogger.warn({ job: input.jobName }, 'lineage service did not return a run_id');
    }
    return runId || null;
  } catch (error) {
    lineageLogger.warn({ error: (error as Error).message }, 'lineage service unavailable');
    return null;
  }
}

export async function recordLineageEvent(runId: string | null, event: LineageEventInput) {
  if (!runId) {
    return;
  }

  try {
    await postJson(`/runs/${runId}/events`, {
      run_id: runId,
      step_id: event.stepId,
      event_type: event.eventType,
      source_dataset: event.sourceDataset,
      target_dataset: event.targetDataset,
      source_column: event.sourceColumn,
      target_column: event.targetColumn,
      transformation: event.transformation,
      target_system: event.targetSystem,
      tenant_id: event.tenantId,
      columns: event.columns || [],
      metadata: event.metadata || {},
    });
  } catch (error) {
    lineageLogger.warn(
      { error: (error as Error).message, runId, stepId: event.stepId },
      'failed to record lineage event',
    );
  }
}

export async function completeLineageRun(
  runId: string | null,
  status: 'COMPLETED' | 'FAILED' = 'COMPLETED',
  metadata: Record<string, any> = {},
) {
  if (!runId) {
    return;
  }

  try {
    await postJson(`/runs/${runId}/complete`, {
      status,
      metadata,
    });
  } catch (error) {
    lineageLogger.warn(
      { error: (error as Error).message, runId, status },
      'failed to finalize lineage run',
    );
  }
}
