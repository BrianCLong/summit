import type { BadgeOptions } from './types';
import type { CheckResult, RunnerOutput } from './types';

export function buildBadge(output: RunnerOutput, options: BadgeOptions) {
  const checksMap = new Map<string, CheckResult>();
  output.checks.forEach((check) => checksMap.set(check.name, check as CheckResult));

  const badge = {
    server: options.server,
    version: options.version ?? null,
    checks: {
      'transport.sse.resume': getStatus(checksMap.get('transport')),
      'jsonrpc.positive': getStatus(checksMap.get('jsonrpc-positive')),
      'jsonrpc.negatives': getStatus(checksMap.get('jsonrpc-negatives')),
      'discovery.manifests': getStatus(checksMap.get('discovery'))
    },
    latency: {
      'sse.p95_ms': getTransportLatency(checksMap.get('transport')),
      'coldstart.p95_ms': options.metrics?.coldStartP95 ?? null
    },
    sandbox: ((checksMap.get('sandbox')?.metadata as Record<string, string>) ?? options.sandboxMetadata) ?? {},
    replay: {
      success_rate: options.metrics?.replaySuccess ?? null
    },
    generatedAt: new Date().toISOString()
  };

  return badge;
}

function getStatus(check?: CheckResult) {
  if (!check) return 'missing';
  return check.pass ? 'pass' : 'fail';
}

function getTransportLatency(check?: CheckResult) {
  if (!check?.details || typeof check.details !== 'object') return null;
  const detail = check.details as {
    http?: { first?: { durationMs?: number }; second?: { durationMs?: number } };
  };
  const values = [detail.http?.first?.durationMs, detail.http?.second?.durationMs].filter((v): v is number => typeof v === 'number');
  if (values.length === 0) return null;
  return Math.max(...values);
}
