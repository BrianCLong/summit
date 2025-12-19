import { Router } from 'express';
import type { PreflightApprover, PreflightRequest } from '@summit/policy-types';
import {
  ActionPolicyError,
  actionPolicyService,
} from '../services/ActionPolicyService.js';
import { logger } from '../utils/logger.js';

interface ExecuteRequestBody {
  preflight_id?: string;
  request?: PreflightRequest;
  approvers?: PreflightApprover[];
}

function handleError(error: unknown, res: any) {
  if (error instanceof ActionPolicyError) {
    return res.status(error.status).json({
      error: error.code,
      message: error.message,
      details: error.details,
    });
  }

  logger.error({ err: error }, 'Unhandled error in actions router');
  return res.status(500).json({
    error: 'internal_error',
    message: 'Unexpected error while evaluating action policy',
  });
}

export function buildActionsRouter(service = actionPolicyService) {
  const router = Router();

  router.post('/preflight', async (req, res) => {
    try {
      const request = req.body as PreflightRequest;
      const decision = await service.runPreflight(request, {
        correlationId: req.correlationId,
        ip: req.ip,
        userAgent: req.get('user-agent') || undefined,
      });

      const responseBody = {
        preflight_id: decision.preflightId,
        correlation_id: req.correlationId,
        decision: {
          allow: decision.allow,
          reason: decision.reason,
          obligations: decision.obligations,
          expires_at: decision.expiresAt.toISOString(),
        },
        request_hash: decision.requestHash,
      };

      return res.status(decision.allow ? 200 : 403).json(responseBody);
    } catch (error) {
      return handleError(error, res);
    }
  });

  router.post('/execute', async (req, res) => {
    try {
      const { preflight_id, request, approvers } =
        (req.body as ExecuteRequestBody) || {};

      const decision = await service.assertExecutable(
        preflight_id as string,
        request as PreflightRequest,
        approvers,
      );

      return res.status(200).json({
        status: 'ok',
        preflight_id: decision.preflightId,
        correlation_id: req.correlationId,
        decision: {
          allow: decision.allow,
          reason: decision.reason,
          obligations: decision.obligations,
        },
      });
    } catch (error) {
      return handleError(error, res);
    }
  });

  return router;
}

export default buildActionsRouter();
