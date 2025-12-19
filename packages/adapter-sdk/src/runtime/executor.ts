import type {
  Adapter,
  AdapterContext,
  AdapterRequest,
  AdapterResponse,
} from '../contracts/adapter';
import { AdapterOutcome } from '../contracts/adapter';
import { AdapterLifecycleIntent, AdapterLifecycleStage } from '../contracts/lifecycle';
import type {
  LifecycleGuard,
  LifecycleGuardContext,
  LifecycleGuardDecision,
} from '../contracts/guard';
import type { PolicyEvaluator } from '../contracts/policy';
import type { AdapterReceipt, RetryMetadata } from '../contracts/receipts';
import { emitAdapterReceipt } from '../receipts';
import { createLifecycleGuard, DEFAULT_MAX_RETRIES } from './guard';

export interface ExecuteAdapterOptions {
  guard?: LifecycleGuard;
  maxRetries?: number;
  policyEvaluator?: PolicyEvaluator;
  emitReceipt?: AdapterContext['emitReceipt'];
  now?: () => number;
}

export interface AdapterExecutionResult<TResult = unknown> {
  response: AdapterResponse<TResult>;
  decision: LifecycleGuardDecision;
  receipt?: AdapterReceipt;
}

export const executeAdapter = async <TPayload, TResult>(
  adapter: Adapter<TPayload, TResult>,
  request: AdapterRequest<TPayload>,
  context: AdapterContext,
  options: ExecuteAdapterOptions = {},
): Promise<AdapterExecutionResult<TResult>> => {
  const now = options.now ?? Date.now;
  const attempt = request.attempt ?? 1;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const guard =
    options.guard ??
    createLifecycleGuard({
      maxRetries,
      policyEvaluator: options.policyEvaluator ?? context.policy,
      now,
    });

  const guardContext: LifecycleGuardContext = {
    adapter: adapter.descriptor,
    request,
    attempt,
    maxRetries,
    stage: request.stage ?? context.stage ?? AdapterLifecycleStage.Ready,
    attributes: context.attributes ?? request.metadata,
  };

  const decision = await guard(AdapterLifecycleIntent.Execute, guardContext);
  const emitReceiptFn = options.emitReceipt ?? context.emitReceipt;
  const retryMeta = buildRetryMetadata(attempt, maxRetries);

  if (!decision.allowed) {
    const response: AdapterResponse<TResult> = {
      outcome: AdapterOutcome.Rejected,
      error: {
        code: 'guard_rejected',
        message:
          decision.reasons[0] ??
          decision.policy?.reason ??
          'Lifecycle guard rejected execution',
        retryable: retryMeta.remaining > 0,
      },
      digests: request.digests,
      policy: decision.policy,
      durationMs: 0,
    };

    const receipt = await emitAdapterReceipt(emitReceiptFn, {
      adapter: adapter.descriptor,
      request,
      decision,
      digests: response.digests,
      retries: retryMeta,
      durationMs: 0,
      metadata: context.attributes,
    });

    return { response, decision, receipt };
  }

  const start = now();

  try {
    const response = await adapter.execute(
      {
        ...request,
        attempt,
        stage: AdapterLifecycleStage.Executing,
      },
      {
        ...context,
        stage: AdapterLifecycleStage.Executing,
        policy: context.policy ?? options.policyEvaluator,
        emitReceipt: emitReceiptFn,
        now,
      },
    );

    const durationMs = now() - start;
    const receipt = await emitAdapterReceipt(emitReceiptFn, {
      adapter: adapter.descriptor,
      request,
      decision,
      digests: {
        ...(request.digests ?? {}),
        ...(response.digests ?? {}),
      },
      retries: {
        ...retryMeta,
        retryable: response.error?.retryable ?? retryMeta.retryable,
      },
      durationMs,
      metadata: context.attributes,
    });

    return {
      response: {
        ...response,
        durationMs,
        policy: response.policy ?? decision.policy,
      },
      decision,
      receipt,
    };
  } catch (error) {
    const durationMs = now() - start;
    const adapterError =
      error instanceof Error
        ? {
            code: 'adapter_execution_failed',
            message: error.message,
            retryable: false,
            details: { name: error.name, stack: error.stack },
          }
        : {
            code: 'adapter_execution_failed',
            message: 'Adapter execution failed',
            retryable: false,
            details: { cause: error },
          };

    const response: AdapterResponse<TResult> = {
      outcome: AdapterOutcome.Failed,
      error: adapterError,
      digests: request.digests,
      policy: decision.policy,
      durationMs,
    };

    const receipt = await emitAdapterReceipt(emitReceiptFn, {
      adapter: adapter.descriptor,
      request,
      decision,
      digests: response.digests,
      retries: retryMeta,
      durationMs,
      metadata: context.attributes,
    });

    return { response, decision, receipt };
  }
};

const buildRetryMetadata = (
  attempt: number,
  maxRetries: number,
): RetryMetadata => ({
  attempt,
  maxRetries,
  remaining: Math.max(maxRetries - attempt, 0),
  retryable: attempt < maxRetries,
});
