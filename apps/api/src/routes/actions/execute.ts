import { randomUUID, createHash } from 'crypto';
import { Router, type Request, type Response } from 'express';

export type ActionRejectionReason =
  | 'preflight_not_found'
  | 'preflight_expired'
  | 'input_hash_mismatch'
  | 'preflight_denied';

export type ActionExecutionEvent =
  | {
      type: 'action.execution.accepted';
      preflightId: string;
      traceId: string;
      receiptId: string;
      inputsHash: string;
      decisionContext?: Record<string, unknown>;
      timestamp: string;
    }
  | {
      type: 'action.execution.rejected';
      preflightId: string;
      traceId: string;
      receiptId: string;
      reason: ActionRejectionReason;
      timestamp: string;
    };

export interface PreflightDecision {
  id: string;
  inputHash: string;
  expiresAt: Date;
  status: 'allow' | 'deny';
  context?: Record<string, unknown>;
}

export interface PolicyDecisionStore {
  get(preflightId: string): Promise<PreflightDecision | undefined>;
  markExecuted?(preflightId: string, receiptId: string): Promise<void>;
}

export interface ActionEventPublisher {
  publish(event: ActionExecutionEvent): Promise<void> | void;
}

export interface ExecuteDependencies {
  policyDecisionStore: PolicyDecisionStore;
  eventPublisher?: ActionEventPublisher;
  now?: () => Date;
}

interface ExecuteRequestBody {
  preflight_id?: string;
  inputs?: unknown;
}

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  const sorted = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  return `{${sorted.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
};

export const computeInputHash = (inputs: unknown): string => {
  return createHash('sha256').update(stableStringify(inputs)).digest('hex');
};

const publishEvent = async (
  publisher: ExecuteDependencies['eventPublisher'],
  event: ActionExecutionEvent,
) => {
  if (!publisher) return;
  await publisher.publish(event);
};

const respondWithError = (
  res: Response,
  statusCode: number,
  error: ActionRejectionReason,
  correlation: { traceId: string; receiptId: string; preflightId?: string },
) => {
  res.locals.correlation_ids = correlation;
  return res.status(statusCode).json({
    error,
    trace_id: correlation.traceId,
    receipt_id: correlation.receiptId,
    preflight_id: correlation.preflightId ?? null,
  });
};

export const createExecuteRouter = (deps: ExecuteDependencies): Router => {
  const router = Router();

  router.post(
    '/actions/execute',
    async (
      req: Request<unknown, unknown, ExecuteRequestBody>,
      res: Response,
    ) => {
      const { preflight_id, inputs } = req.body ?? {};
      const nowProvider = deps.now ?? (() => new Date());

      if (!preflight_id) {
        return respondWithError(res, 400, 'preflight_not_found', {
          traceId: randomUUID(),
          receiptId: randomUUID(),
        });
      }

      const traceId =
        (req.headers['x-trace-id'] as string | undefined) || randomUUID();
      const receiptId = randomUUID();
      const correlation = { traceId, receiptId, preflightId: preflight_id };

      const preflightDecision = await deps.policyDecisionStore.get(
        preflight_id,
      );

      if (!preflightDecision) {
        await publishEvent(deps.eventPublisher, {
          type: 'action.execution.rejected',
          preflightId: preflight_id,
          traceId,
          receiptId,
          reason: 'preflight_not_found',
          timestamp: nowProvider().toISOString(),
        });

        return respondWithError(res, 404, 'preflight_not_found', correlation);
      }

      const now = nowProvider();
      const expiration =
        preflightDecision.expiresAt instanceof Date
          ? preflightDecision.expiresAt
          : new Date(preflightDecision.expiresAt);

      if (expiration.getTime() <= now.getTime()) {
        await publishEvent(deps.eventPublisher, {
          type: 'action.execution.rejected',
          preflightId: preflightDecision.id,
          traceId,
          receiptId,
          reason: 'preflight_expired',
          timestamp: now.toISOString(),
        });

        return respondWithError(res, 410, 'preflight_expired', correlation);
      }

      const computedHash = computeInputHash(inputs);
      if (computedHash !== preflightDecision.inputHash) {
        await publishEvent(deps.eventPublisher, {
          type: 'action.execution.rejected',
          preflightId: preflightDecision.id,
          traceId,
          receiptId,
          reason: 'input_hash_mismatch',
          timestamp: now.toISOString(),
        });

        return respondWithError(res, 400, 'input_hash_mismatch', correlation);
      }

      if (preflightDecision.status !== 'allow') {
        await publishEvent(deps.eventPublisher, {
          type: 'action.execution.rejected',
          preflightId: preflightDecision.id,
          traceId,
          receiptId,
          reason: 'preflight_denied',
          timestamp: now.toISOString(),
        });
        return respondWithError(res, 403, 'preflight_denied', correlation);
      }

      res.locals.correlation_ids = correlation;

      await publishEvent(deps.eventPublisher, {
        type: 'action.execution.accepted',
        preflightId: preflightDecision.id,
        traceId,
        receiptId,
        inputsHash: computedHash,
        decisionContext: preflightDecision.context,
        timestamp: now.toISOString(),
      });

      if (deps.policyDecisionStore.markExecuted) {
        await deps.policyDecisionStore.markExecuted(
          preflightDecision.id,
          receiptId,
        );
      }

      return res.status(202).json({
        status: 'accepted',
        preflight_id: preflightDecision.id,
        trace_id: traceId,
        receipt_id: receiptId,
      });
    },
  );

  return router;
};
