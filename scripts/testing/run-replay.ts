import fs from 'node:fs';
import path from 'node:path';

import type { ReplayDescriptor } from '../../ga-graphai/packages/common-types/src/replay.js';

export type ReplayClassification = 'PASS' | 'FAIL' | 'DRIFT';

export interface ReplayRunResult {
  status: ReplayClassification;
  details: string;
}

function normalizeMessage(message?: string): string {
  return (message ?? '').toLowerCase().trim();
}

function evaluateClassification(
  original: ReplayDescriptor,
  currentStatus: 'success' | 'error',
  currentMessage?: string,
): ReplayClassification {
  if (original.outcome.status === 'error') {
    if (currentStatus === 'success') {
      return 'PASS';
    }
    if (
      normalizeMessage(original.outcome.message) === normalizeMessage(currentMessage)
    ) {
      return 'FAIL';
    }
    return 'DRIFT';
  }
  return currentStatus === 'success' ? 'PASS' : 'DRIFT';
}

async function runIntelGraphReplay(
  descriptor: ReplayDescriptor,
): Promise<ReplayRunResult> {
  const { sandboxExecute } = await import(
    '../../ga-graphai/packages/query-copilot/src/sandbox.js'
  );
  const payload = (descriptor.request.payload as Record<string, unknown>) ?? {};
  const meta = (descriptor.request.meta as Record<string, unknown>) ?? {};
  try {
    sandboxExecute({
      cypher: String(payload.cypher ?? ''),
      tenantId: descriptor.context.tenantId ?? 'unknown-tenant',
      policy: (meta.policy as { authorityId?: string; purpose?: string }) ?? {
        authorityId: 'unknown',
        purpose: descriptor.context.purpose ?? 'investigation',
      },
      timeoutMs:
        typeof payload.timeoutMs === 'number' ? payload.timeoutMs : undefined,
      featureFlags:
        (meta.featureFlags as Record<string, boolean | string> | undefined) ??
        descriptor.context.featureFlags,
      traceId: descriptor.context.traceId,
      requestId: descriptor.context.requestId,
      userId: descriptor.context.userIdHash,
      environment: descriptor.environment.env?.INTELGRAPH_ENV,
    });
    return {
      status: evaluateClassification(descriptor, 'success'),
      details: 'Replayed IntelGraph sandbox request without error.',
    };
  } catch (error) {
    return {
      status: evaluateClassification(
        descriptor,
        'error',
        error instanceof Error ? error.message : String(error),
      ),
      details:
        error instanceof Error
          ? error.message
          : 'Replay failed with unknown error.',
    };
  }
}

async function runMaestroReplay(
  descriptor: ReplayDescriptor,
): Promise<ReplayRunResult> {
  const payload = descriptor.request.payload as Record<string, unknown>;
  try {
    const { runReferenceWorkflow } = await import(
      '../../ga-graphai/packages/meta-orchestrator/src/index.js'
    );
    const result = await runReferenceWorkflow(payload ?? {});
    const failed = result.outcome.trace.some(
      (entry) => entry.status === 'failed',
    );
    return {
      status: evaluateClassification(
        descriptor,
        failed ? 'error' : 'success',
        failed ? 'stage failure' : undefined,
      ),
      details: failed
        ? 'Replay reproduced a failed stage execution.'
        : 'Replay completed without failed stages.',
    };
  } catch (error) {
    return {
      status: evaluateClassification(
        descriptor,
        'error',
        error instanceof Error ? error.message : String(error),
      ),
      details:
        error instanceof Error
          ? error.message
          : 'Replay crashed with unknown error.',
    };
  }
}

export async function runReplay(replayPath: string): Promise<ReplayRunResult> {
  // AI Determinism / Replay-Only Mode Check
  const isReplayOnly = process.env.ENABLE_QWEN_REPLAY_ONLY === 'true';
  if (isReplayOnly) {
     console.log('🔒 AI Replay-Only Mode Active');
     // Ensure we fail fast if the replay file is missing (enforced below)
     // and strict drift detection is enabled.
  }

  const fullPath = path.resolve(replayPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Replay file not found: ${fullPath}`);
  }
  const raw = fs.readFileSync(fullPath, 'utf-8');
  const descriptor = JSON.parse(raw) as ReplayDescriptor;

  if (!descriptor?.service) {
    throw new Error('Invalid replay descriptor: missing service');
  }

  if (descriptor.service === 'intelgraph') {
    return runIntelGraphReplay(descriptor);
  }
  if (descriptor.service === 'maestro-conductor') {
    return runMaestroReplay(descriptor);
  }

  throw new Error(`Unsupported replay service: ${descriptor.service}`);
}

if (process.argv[1] && process.argv[1].includes('run-replay')) {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: ts-node scripts/testing/run-replay.ts <replay-file>');
    process.exit(1);
  }
  runReplay(target)
    .then((result) => {
      console.log(`Replay result: ${result.status}`);
      console.log(result.details);

      const isReplayOnly = process.env.ENABLE_QWEN_REPLAY_ONLY === 'true';
      if (isReplayOnly && result.status !== 'PASS') {
        console.error('❌ AI Replay Failed in Determinism Mode');
        console.error('   A cache miss or drift was detected.');
        console.error('   Run locally with ENABLE_QWEN_RECORD=true to update fixtures.');
        process.exit(1);
      }

      if (result.status === 'FAIL') {
          process.exit(1);
      }
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exit(1);
    });
}
