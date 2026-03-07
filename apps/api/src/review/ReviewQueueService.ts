import { ReviewAuditLog } from "./ReviewAuditLog.js";
import { ReviewDecisionEngine } from "./ReviewDecisionEngine.js";
import {
  DecisionRulesByType,
  ReviewDecision,
  ReviewItem,
  ReviewStatus,
  ReviewType,
} from "./models.js";

interface QueueQuery {
  types?: ReviewType[];
  statuses?: ReviewStatus[];
  sort?: "createdAt:asc" | "createdAt:desc";
  cursor?: string;
  limit?: number;
}

export class ReviewQueueService {
  private items: Map<string, ReviewItem> = new Map();
  private audit: ReviewAuditLog;
  private decisionEngine: ReviewDecisionEngine;

  constructor(
    rules: DecisionRulesByType = {},
    auditLog: ReviewAuditLog = new ReviewAuditLog(),
    engine?: ReviewDecisionEngine
  ) {
    this.audit = auditLog;
    this.decisionEngine = engine ?? new ReviewDecisionEngine(rules);
  }

  seed(items: ReviewItem[]) {
    for (const item of items) {
      this.items.set(item.id, item);
    }
  }

  enqueue(item: ReviewItem) {
    this.items.set(item.id, item);
  }

  getAuditLog() {
    return this.audit.getAll();
  }

  getById(id: string) {
    return this.items.get(id);
  }

  list(query: QueueQuery = {}) {
    const limit = query.limit ?? 25;
    const cursorIndex = query.cursor ? Number.parseInt(query.cursor, 10) : 0;

    const filtered = Array.from(this.items.values()).filter((item) => {
      const typeMatch = !query.types || query.types.includes(item.type);
      const statusMatch = !query.statuses || query.statuses.includes(item.status);
      return typeMatch && statusMatch;
    });

    const sorted = filtered.sort((a, b) => {
      const diff = a.createdAt.localeCompare(b.createdAt);
      if (query.sort === "createdAt:desc") {
        return diff * -1;
      }
      if (diff !== 0) return diff;
      return a.id.localeCompare(b.id);
    });

    const page = sorted.slice(cursorIndex, cursorIndex + limit);
    const nextCursor =
      cursorIndex + limit < sorted.length ? String(cursorIndex + limit) : undefined;

    return { items: page, nextCursor };
  }

  decide(itemId: string, decision: ReviewDecision) {
    const existing = this.items.get(itemId);
    if (!existing) {
      throw new Error("item_not_found");
    }

    const result = this.decisionEngine.applyDecision(existing, decision);
    this.items.set(itemId, result.item);
    if (!result.idempotent) {
      this.audit.record(itemId, result.decision);
    }
    return result;
  }
}
