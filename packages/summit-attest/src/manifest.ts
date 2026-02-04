import { writeFileSync } from 'fs';
import { generateRunId, generateRunUri } from '@intelgraph/openlineage';

export interface RunManifest {
  schemaVersion: 'v1';
  runId: string;
  runUri: string;
  nominalTime?: string;
  inputs: Array<{ namespace: string; name: string; digest?: string }>;
  outputs: Array<{ namespace: string; name: string; digest?: string }>;
  metadata: Record<string, any>;
}

export function createManifest(params: {
  tenant: string;
  namespace: string;
  job: string;
  runId?: string;
  nominalTime?: string;
  inputs?: Array<{ namespace: string; name: string; digest?: string }>;
  outputs?: Array<{ namespace: string; name: string; digest?: string }>;
  metadata?: Record<string, any>;
}): RunManifest {
  const runId = params.runId || generateRunId();
  const runUri = generateRunUri({
    tenant: params.tenant,
    namespace: params.namespace,
    job: params.job,
    runId,
  });

  return {
    schemaVersion: 'v1',
    runId,
    runUri,
    nominalTime: params.nominalTime || new Date().toISOString(),
    inputs: params.inputs || [],
    outputs: params.outputs || [],
    metadata: params.metadata || {},
  };
}

export function saveManifest(manifest: RunManifest, path: string) {
  // Canonicalize by sorting keys? For now just stable JSON stringify
  const content = JSON.stringify(manifest, Object.keys(manifest).sort(), 2);
  writeFileSync(path, content + '\n');
}
