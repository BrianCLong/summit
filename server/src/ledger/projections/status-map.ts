import { LedgerEvent } from '../event-schema.js';

export interface WorkflowStatus {
    workflow_id: string;
    status: 'pending' | 'in_progress' | 'complete' | 'failed';
    current_step?: string;
    completed_steps: string[];
    failed_steps: string[];
}

export class StatusMapProjection {
    public build(events: LedgerEvent[]): Record<string, WorkflowStatus> {
        const statuses: Record<string, WorkflowStatus> = {};

        for (const event of events) {
            const wid = event.workflow_id;
            if (!statuses[wid]) {
                statuses[wid] = {
                    workflow_id: wid,
                    status: 'pending',
                    completed_steps: [],
                    failed_steps: []
                };
            }

            const state = statuses[wid];

            switch (event.type) {
                case 'workflow.started':
                    state.status = 'in_progress';
                    break;
                case 'workflow.completed':
                    state.status = 'complete';
                    break;
                case 'step.started':
                    if (event.step_id) state.current_step = event.step_id;
                    break;
                case 'step.succeeded':
                    if (event.step_id) {
                         state.completed_steps.push(event.step_id);
                         if (state.current_step === event.step_id) {
                              state.current_step = undefined;
                         }
                    }
                    break;
                case 'step.failed':
                     if (event.step_id) {
                         state.failed_steps.push(event.step_id);
                     }
                     state.status = 'failed';
                     break;
            }
        }
        return statuses;
    }
}
