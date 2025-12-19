import pLimit from 'p-limit';
import { AdapterDefinition, AdapterRequest, AdapterResponse } from '../contracts/types';
import { enforcePolicy, PolicyEvaluator } from './guard';
import { createReceipt } from '../receipts';

export interface ExecutorOptions {
  timeoutMs?: number;
  maxRetries?: number;
  concurrency?: number;
  circuitBreakerThreshold?: number;
  idempotencyKey?: string;
  policyEvaluator: PolicyEvaluator;
  emitReceipt?: (receipt: ReturnType<typeof createReceipt>) => Promise<void>;
  digestFn?: (data: unknown) => string;
}

const defaultDigest = (data: unknown): string =>
  Buffer.from(JSON.stringify(data)).toString('base64');

export async function executeAdapter<TPayload, TResult>(
  definition: AdapterDefinition,
  lifecycle: keyof AdapterDefinition['lifecycle'],
  request: AdapterRequest<TPayload>,
  options: ExecutorOptions,
): Promise<AdapterResponse<TResult>> {
  const handler = definition.lifecycle?.[lifecycle];
  if (!handler) {
    throw new Error(`Lifecycle handler ${lifecycle} not implemented for adapter ${definition.name}`);
  }

  const {
    timeoutMs = 30_000,
    maxRetries = 2,
    circuitBreakerThreshold = 5,
    policyEvaluator,
    emitReceipt,
    digestFn = defaultDigest,
  } = options;

  if (options.concurrency && options.concurrency > 0) {
    const limiter = pLimit(options.concurrency);
    return limiter(() =>
      executeAdapter(definition, lifecycle, request, { ...options, concurrency: 0 }),
    );
  }

  if (maxRetries > circuitBreakerThreshold) {
    throw new Error('Circuit breaker threshold exceeded before execution');
  }

  await enforcePolicy(lifecycle, request, policyEvaluator);

  let attempt = 0;
  const startedAt = Date.now();
  while (attempt <= maxRetries) {
    try {
      const result = await runWithTimeout(
        () => handler(request),
        timeoutMs,
        `Adapter ${definition.name} timed out after ${timeoutMs}ms`,
      );
      const durationMs = Date.now() - startedAt;
      const receipt = createReceipt({
        adapterId: request.context.adapterId,
        runId: request.context.runId,
        lifecycle,
        decision: 'allow',
        inputsDigest: digestFn(request.payload),
        outputsDigest: digestFn(result.result),
        retries: attempt,
        durationMs,
        externalCalls: [],
        timestamp: new Date().toISOString(),
      });
      if (emitReceipt) {
        await emitReceipt(receipt);
      }
      return { ...result, durationMs, retries: attempt, receiptId: receipt.timestamp };
    } catch (error) {
      attempt += 1;
      if (attempt > maxRetries) {
        throw error;
      }
      await wait(backoff(attempt));
    }
  }

  throw new Error('Adapter execution failed after retries');
}

async function runWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number, message: string) {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  const result = await Promise.race([fn(), timeoutPromise]);
  clearTimeout(timeoutId!);
  return result;
}

const backoff = (attempt: number) => Math.min(1000 * 2 ** attempt, 10_000);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
