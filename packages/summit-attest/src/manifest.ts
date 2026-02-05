import crypto from 'node:crypto';

export interface RunManifest {
  version: string;
  runId: string;
  timestamp: string;
  inputs: Array<{
    name: string;
    uri: string;
    digest?: Record<string, string>;
  }>;
  outputs: Array<{
    name: string;
    uri: string;
    digest?: Record<string, string>;
  }>;
  metadata: Record<string, any>;
}

export function generateManifest(runId: string, inputs: any[], outputs: any[]): RunManifest {
  return {
    version: '1.0.0',
    runId,
    timestamp: new Date().toISOString(),
    inputs,
    outputs,
    metadata: {}
  };
}

export function canonicalize(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalize).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalize(obj[k])).join(',') + '}';
}

export function computeDigest(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}
