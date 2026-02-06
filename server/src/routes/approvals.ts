import express from 'express';
import { Maestro } from '../maestro/core.js';
import logger from '../config/logger.js';
import {
  ApprovalStatus,
  approveApproval,
  canApprove,
  createApproval,
  getApprovalById,
  listApprovals,
  rejectApproval,
} from '../services/approvals.js';

interface ApprovalPayload {
  userId?: string;
  requestText?: string;
  [key: string]: unknown;
}

const approvalsLogger = logger.child({ name: 'ApprovalsRouter' });

const resolveUserId = (req: express.Request): string | null => {
  const user = (req as any).user;
  return user?.sub || user?.id || null;
};

const ensureApprover = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  const role = (req as any).user?.role;
  if (!canApprove(role)) {
    return res.status(403).json({ error: 'Approval permissions required' });
  }
  next();
};

export function buildApprovalsRouter(maestro?: Maestro): express.Router {
const router = express.Router();
const singleParam = (value: unknown): string | undefined =>
  Array.isArray(value) ? (value[0] as string | undefined) : typeof value === 'string' ? value : undefined;
  router.use(express.json());

  router.post('/', async (req, res, next) => {
    try {
      const requesterId = resolveUserId(req) || req.body.requesterId;
      if (!requesterId) {
        return res.status(400).json({ error: 'requesterId is required' });
      }

      const approval = await createApproval({
        requesterId,
        action: req.body.action,
        payload: req.body.payload,
        reason: req.body.reason,
        runId: req.body.runId,
      });

      res.status(201).json(approval);
    } catch (error: any) {
      next(error);
    }
  });

  router.get('/', async (req, res, next) => {
    try {
      const role = (req as any).user?.role;
      const userId = resolveUserId(req);
      const status = (req.query.status as ApprovalStatus | undefined) || undefined;

      const approvals = await listApprovals({ status });
      const visible = canApprove(role)
        ? approvals
        : approvals.filter((item) => item.requester_id === userId);

      res.json(visible);
    } catch (error: any) {
      next(error);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const approval = await getApprovalById(singleParam(req.params.id) ?? '');
      if (!approval) {
        return res.status(404).json({ error: 'Approval not found' });
      }
      res.json(approval);
    } catch (error: any) {
      next(error);
    }
  });

  router.post('/:id/approve', ensureApprover, async (req, res, next) => {
    try {
      const approverId = resolveUserId(req);
      if (!approverId) {
        return res.status(400).json({ error: 'approverId is required' });
      }

      const approval = await approveApproval(
        singleParam(req.params.id) ?? '',
        approverId,
        req.body?.reason,
      );

      if (!approval) {
        return res.status(409).json({ error: 'Approval not pending or not found' });
      }

      let actionResult: unknown = null;
      if (
        maestro &&
        approval.action === 'maestro_run' &&
        approval.payload
      ) {
        const payload = approval.payload as ApprovalPayload;
        actionResult = await maestro.runPipeline(
          payload.userId || approverId,
          String(payload.requestText || ''),
        );
      } else if (
        maestro &&
        approval.action === 'maestro_task_execution' &&
        approval.payload
      ) {
        const payload = approval.payload as { taskId: string };
        const task = await maestro.getTask(payload.taskId);
        if (task) {
          // Re-execute the task now that it has been approved
          // Governance flip check will allow it this time because of the manual approval record
          actionResult = await maestro.executeTask(task);
        }
      }

      approvalsLogger.info(
        {
          approval_id: approval.id,
          action: approval.action,
          approver: approverId,
          run_id: approval.run_id,
        },
        'Approval executed',
      );

      res.json({ approval, actionResult });
    } catch (error: any) {
      next(error);
    }
  });

  router.post('/:id/reject', ensureApprover, async (req, res, next) => {
    try {
      const approverId = resolveUserId(req);
      if (!approverId) {
        return res.status(400).json({ error: 'approverId is required' });
      }

      const approval = await rejectApproval(
        singleParam(req.params.id) ?? '',
        approverId,
        req.body?.reason,
      );

      if (!approval) {
        return res.status(409).json({ error: 'Approval not pending or not found' });
      }

      approvalsLogger.info(
        {
          approval_id: approval.id,
          action: approval.action,
          approver: approverId,
          run_id: approval.run_id,
        },
        'Approval rejected',
      );

      res.json({ approval });
    } catch (error: any) {
      next(error);
    }
  });

  return router;
}
