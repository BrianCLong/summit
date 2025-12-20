import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { Router } from 'express';
import { resolveCorrelationId } from '../../lib/correlation.js';
import { hashExecutionInput } from '../../lib/hash.js';
import {
  type PolicyDecisionStore,
  type PreflightRecord,
  type ExecutionRecord,
} from '../../services/PolicyDecisionStore.js';
import { type EventPublisher } from '../../services/EventPublisher.js';

interface ExecuteRequestBody {
  preflight_id?: string;
  action?: string;
  input?: unknown;
}

const isExpired = (preflight: PreflightRecord): boolean => {
  if (!preflight.expiresAt) {
    return false;
  }
  return new Date(preflight.expiresAt).getTime() <= Date.now();
};

const buildExecutionRecord = (
  correlationId: string,
): ExecutionRecord => ({
  executionId: `exec_${crypto.randomUUID()}`,
  correlationId,
  executedAt: new Date().toISOString(),
});

export const createExecuteRouter = (
  store: PolicyDecisionStore,
  events: EventPublisher,
): Router => {
  const router = Router();

  router.post(
    '/execute',
    async (req: Request<unknown, unknown, ExecuteRequestBody>, res: Response) => {
      const correlationId = resolveCorrelationId(req, res);
      const { preflight_id: preflightId, action, input } = req.body ?? {};

      if (!preflightId || typeof preflightId !== 'string') {
        return res.status(400).json({
          error: 'invalid_preflight_id',
          message: 'preflight_id is required',
          correlation_id: correlationId,
        });
      }

      if (typeof input === 'undefined') {
        return res.status(400).json({
          error: 'invalid_input',
          message: 'input payload is required',
          correlation_id: correlationId,
        });
      }

      const preflight = await store.getPreflight(preflightId);

      if (!preflight) {
        return res.status(404).json({
          error: 'preflight_not_found',
          correlation_id: correlationId,
        });
      }

      if (isExpired(preflight)) {
        return res.status(410).json({
          error: 'preflight_expired',
          correlation_id: correlationId,
        });
      }

      const expectedHash = preflight.inputHash;
      const candidateHash = hashExecutionInput({
        action: action ?? preflight.action,
        input: input as any,
      });

      if (expectedHash !== candidateHash) {
        return res.status(400).json({
          error: 'preflight_hash_mismatch',
          correlation_id: correlationId,
        });
      }

      const execution = buildExecutionRecord(correlationId);
      await store.recordExecution(preflightId, execution);

      events.publish({
        type: 'action.executed',
        preflightId,
        correlationId,
        action: action ?? preflight.action,
        payload: input,
      });

      return res.status(200).json({
        status: 'accepted',
        execution_id: execution.executionId,
        correlation_id: correlationId,
      });
    },
  );

  return router;
};
