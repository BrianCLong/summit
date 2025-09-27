import { ActionLog } from './action-log';
import type { ActionRecord, NormalizedPlan, PropagationDomain, PropagationSummary } from './types';

export class PropagationEngine {
  constructor(private readonly actionLog: ActionLog) {}

  propagate(plan: NormalizedPlan, completedAt: string): PropagationSummary {
    const summary: PropagationSummary = {
      caches: 0,
      indexes: 0,
      features: 0,
      exports: 0
    };

    for (const domain of ActionLog.domains()) {
      const targets = plan.purgeScope[domain];
      for (const target of targets) {
        const record: ActionRecord = {
          planId: plan.planId,
          datasetId: plan.datasetId,
          domain: domain as PropagationDomain,
          target,
          status: 'purged',
          completedAt
        };
        this.actionLog.record(record);
        const domainKey = domain as keyof PropagationSummary;
        summary[domainKey] += 1;
      }
    }

    return summary;
  }
}
