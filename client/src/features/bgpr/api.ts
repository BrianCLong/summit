export interface GuardrailThresholds {
  minBlockRate: number;
  maxLatencyMs: number;
  maxFnDelta: number;
}

export interface RolloutManifest {
  id: string;
  policyVersion: string;
  canaryPopulation: string[];
  controlPopulation: string[];
  thresholds: GuardrailThresholds;
  createdAt: string;
  signature: string;
}

export interface Metrics {
  blockRate: number;
  fnCanaryCatches: number;
  latencyMs: number;
}

export interface MetricsComparison {
  canary: Metrics;
  control: Metrics;
}

export interface DryRunResult {
  manifest: RolloutManifest;
  metrics: MetricsComparison;
}

export interface RolloutResult {
  manifest: RolloutManifest;
  metrics: MetricsComparison;
  breaches: string[];
  reverted: boolean;
  auditEvent: AuditEvent;
}

export interface AuditEvent {
  manifestId: string;
  policyVersion: string;
  outcome: 'rolled_out' | 'reverted' | 'dry_run';
  reason: string;
  timestamp: string;
}

export interface StatusResponse {
  currentPolicy: string;
  lastResult: RolloutResult | null;
  auditTrail: AuditEvent[];
}

const DEFAULT_BASE_URL = import.meta.env.VITE_BGPR_BASE_URL ?? 'http://localhost:8085';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${DEFAULT_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'BGPR request failed');
  }
  return (await response.json()) as T;
}

export async function fetchStatus(): Promise<StatusResponse> {
  return request<StatusResponse>('/api/bgpr/status');
}

export async function submitDryRun(manifest: RolloutManifest): Promise<DryRunResult> {
  return request<DryRunResult>('/api/bgpr/dry-run', {
    method: 'POST',
    body: JSON.stringify({ manifest }),
  });
}

export async function submitRollout(manifest: RolloutManifest): Promise<RolloutResult> {
  return request<RolloutResult>('/api/bgpr/rollouts', {
    method: 'POST',
    body: JSON.stringify({ manifest }),
  });
}

export function createSampleManifest(): RolloutManifest {
  const now = new Date().toISOString();
  return {
    id: 'rollout-demo',
    policyVersion: 'policy-v2',
    canaryPopulation: ['tenant-a', 'tenant-b'],
    controlPopulation: ['tenant-c', 'tenant-d'],
    thresholds: {
      minBlockRate: 0.72,
      maxLatencyMs: 110,
      maxFnDelta: 4,
    },
    createdAt: now,
    signature: 'replace-with-valid-signature',
  };
}

