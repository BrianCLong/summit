import express from "express";
import { ReviewQueueService } from "../../review/ReviewQueueService.js";
import { ReviewDecisionAction, ReviewStatus, ReviewType } from "../../review/models.js";
import { RBACManager } from "../../../../../packages/authentication/src/rbac/rbac-manager.js";
import { requirePermission } from "../../middleware/security.js";

export interface ReviewRouterDeps {
  queue: ReviewQueueService;
  rbacManager: RBACManager;
}

function parseArrayParam(value?: string | string[]) {
  if (!value) return undefined;
  const values = Array.isArray(value) ? value : value.split(",");
  return values.map((v) => v.trim()).filter(Boolean);
}

export function createReviewRouter({ queue, rbacManager }: ReviewRouterDeps) {
  const router = express.Router();

  router.get("/queue", requirePermission(rbacManager, "review", "read"), (req, res) => {
    const types = parseArrayParam(req.query.type as string | undefined) as ReviewType[] | undefined;
    const statuses = parseArrayParam(req.query.status as string | undefined) as
      | ReviewStatus[]
      | undefined;
    const sort =
      (req.query.sort as "createdAt:asc" | "createdAt:desc" | undefined) ?? "createdAt:asc";
    const cursor = req.query.cursor as string | undefined;
    const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : undefined;

    const { items, nextCursor } = queue.list({ types, statuses, sort, cursor, limit });
    res.json({ items, nextCursor });
  });

  router.get("/item/:id", requirePermission(rbacManager, "review", "read"), (req, res) => {
    const item = queue.getById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: "item_not_found" });
    }
    return res.json(item);
  });

  router.post(
    "/item/:id/decision",
    requirePermission(rbacManager, "review", "decide"),
    (req, res) => {
      const correlationId = req.header("x-correlation-id");
      const { action, reasonCode, note } = req.body as {
        action?: ReviewDecisionAction;
        reasonCode?: string;
        note?: string;
      };

      if (!correlationId) {
        return res.status(400).json({ error: "correlation_id_required" });
      }
      if (!action || !reasonCode) {
        return res.status(400).json({ error: "decision_payload_invalid" });
      }

      try {
        const { decision, idempotent } = queue.decide(req.params.id, {
          action,
          reasonCode,
          note,
          correlationId,
          decidedAt: new Date().toISOString(),
        });
        return res.status(idempotent ? 200 : 201).json({ decision, idempotent });
      } catch (error) {
        if (error instanceof Error && error.message === "item_not_found") {
          return res.status(404).json({ error: "item_not_found" });
        }
        if (error instanceof Error && error.message === "decision_already_recorded") {
          return res.status(409).json({ error: "decision_already_recorded" });
        }
        if (error instanceof Error && error.message.startsWith("action_not_allowed")) {
          return res.status(400).json({ error: error.message });
        }
        if (error instanceof Error && error.message === "reason_required") {
          return res.status(400).json({ error: "reason_required" });
        }
        return res.status(500).json({ error: "decision_failed" });
      }
    }
  );

  return router;
}
