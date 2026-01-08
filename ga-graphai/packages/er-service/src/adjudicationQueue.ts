import { randomUUID } from "node:crypto";

import type {
  AdjudicationDecision,
  AdjudicationDecisionInput,
  AdjudicationQuery,
} from "./types.js";

interface QueueOptions {
  clock?: () => Date;
  idFactory?: (scope: string) => string;
}

export class AdjudicationQueue {
  private readonly decisions: AdjudicationDecision[] = [];

  private readonly clock: () => Date;

  private readonly idFactory: (scope: string) => string;

  constructor(options: QueueOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.idFactory = options.idFactory ?? (() => randomUUID());
  }

  enqueue(input: AdjudicationDecisionInput): AdjudicationDecision {
    const decision: AdjudicationDecision = {
      ...input,
      id: this.idFactory("adj"),
      status: "queued",
      createdAt: this.clock().toISOString(),
    };
    this.decisions.push(decision);
    return decision;
  }

  resolve(id: string, resolutionNote?: string): AdjudicationDecision {
    const decision = this.decisions.find((item) => item.id === id);
    if (!decision) {
      throw new Error(`Adjudication decision ${id} not found`);
    }
    decision.status = "resolved";
    decision.resolutionNote = resolutionNote;
    decision.resolvedAt = this.clock().toISOString();
    return decision;
  }

  list(query: AdjudicationQuery = {}): AdjudicationDecision[] {
    return this.decisions
      .filter((decision) => {
        if (query.tenantId && decision.tenantId !== query.tenantId) {
          return false;
        }
        if (query.status && decision.status !== query.status) {
          return false;
        }
        if (query.action && decision.action !== query.action) {
          return false;
        }
        return true;
      })
      .map((decision) => ({ ...decision }));
  }
}
