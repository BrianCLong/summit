import { AuditEntry, ReviewDecision } from "./models.js";

export class ReviewAuditLog {
  private entries: AuditEntry[] = [];

  constructor(private readonly clock: () => Date = () => new Date()) {}

  record(itemId: string, decision: ReviewDecision) {
    const decidedAt = decision.decidedAt ?? this.clock().toISOString();
    this.entries.push({
      id: `audit_${this.entries.length + 1}`,
      itemId,
      correlationId: decision.correlationId,
      action: decision.action,
      reasonCode: decision.reasonCode,
      note: decision.note,
      decidedAt,
    });
  }

  getAll() {
    return [...this.entries];
  }
}
