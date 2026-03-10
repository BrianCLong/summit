import { LedgerEvent } from '../ledger/event-schema.js';

export interface WorkflowMetrics {
    workflow_id: string;
    total_steps: number;
    failed_steps: number;
    succeeded_steps: number;
    policy_denials: number;
}

export class LedgerMetricsGenerator {
    public generate(events: LedgerEvent[]): Record<string, WorkflowMetrics> {
        const metrics: Record<string, WorkflowMetrics> = {};

        for (const event of events) {
            const wid = event.workflow_id;
            if (!metrics[wid]) {
                metrics[wid] = {
                    workflow_id: wid,
                    total_steps: 0,
                    failed_steps: 0,
                    succeeded_steps: 0,
                    policy_denials: 0
                };
            }

            const m = metrics[wid];

            if (event.type === 'step.started') m.total_steps++;
            if (event.type === 'step.succeeded') m.succeeded_steps++;
            if (event.type === 'step.failed') m.failed_steps++;
            if (event.type === 'policy.denied') m.policy_denials++;
        }

        return metrics;
    }
}
