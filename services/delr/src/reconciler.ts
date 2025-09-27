import type { ActionLog } from './action-log';
import type { NormalizedPlan, PropagationDomain, ReconciliationReport } from './types';

export class Reconciler {
  constructor(private readonly actionLog: ActionLog) {}

  verify(plan: NormalizedPlan): ReconciliationReport {
    const residuals: string[] = [];

    for (const domain of planDomainOrder()) {
      for (const target of plan.purgeScope[domain]) {
        if (!this.actionLog.hasRecord(plan.planId, domain, target)) {
          residuals.push(`${domain}:${target}`);
        }
      }
    }

    return {
      planId: plan.planId,
      residuals,
      isClean: residuals.length === 0
    };
  }
}

function planDomainOrder(): PropagationDomain[] {
  return ['caches', 'indexes', 'features', 'exports'];
}
