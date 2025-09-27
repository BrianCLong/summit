import { ActionLog } from './action-log';
import { NotificationLog } from './notification-log';
import { NotificationService } from './notification-service';
import { normalizePlan } from './plan';
import { PropagationEngine } from './propagation-engine';
import { ReceiptFactory } from './receipt-factory';
import { Reconciler } from './reconciler';
import { SystemClock } from './clock';
import type {
  ActionRecord,
  Clock,
  EolPlan,
  EolReceipt,
  NotificationEntry,
  PropagationSummary
} from './types';

export interface DelrServiceOptions {
  clock?: Clock;
}

export class DatasetEndOfLifeRegistrar {
  private readonly actionLog = new ActionLog();
  private readonly notificationLog = new NotificationLog();
  private readonly propagationEngine = new PropagationEngine(this.actionLog);
  private readonly notificationService = new NotificationService(this.notificationLog);
  private readonly reconciler = new Reconciler(this.actionLog);
  private readonly receiptFactory = new ReceiptFactory();
  private readonly clock: Clock;

  constructor(options: DelrServiceOptions = {}) {
    this.clock = options.clock ?? new SystemClock();
  }

  registerPlan(plan: EolPlan): EolReceipt {
    const normalized = normalizePlan(plan);
    const completedAt = this.clock.now().toISOString();

    const propagation = this.propagationEngine.propagate(normalized, completedAt);
    this.notificationService.notify(normalized, completedAt);

    const actions = this.actionLog.recordsForPlan(normalized.planId);
    const verification = this.reconciler.verify(normalized);

    const receipt = this.receiptFactory.create(
      normalized,
      completedAt,
      propagation,
      verification,
      actions
    );

    if (!receipt.verification.isClean) {
      const details = receipt.verification.residuals.join(', ');
      throw new Error(`EOL reconciliation failed with residuals: ${details}`);
    }

    return receipt;
  }

  propagationSummary(planId: string): PropagationSummary {
    const actions = this.actionLog.recordsForPlan(planId);
    const summary: PropagationSummary = { caches: 0, indexes: 0, features: 0, exports: 0 };
    for (const action of actions) {
      const domainKey = action.domain as keyof PropagationSummary;
      summary[domainKey] += 1;
    }
    return summary;
  }

  actionRecords(planId: string): ActionRecord[] {
    return this.actionLog.recordsForPlan(planId);
  }

  notificationEntries(planId?: string): NotificationEntry[] {
    if (planId) {
      return this.notificationLog.entriesForPlan(planId);
    }
    return this.notificationLog.all();
  }
}
