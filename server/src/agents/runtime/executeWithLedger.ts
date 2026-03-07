import { LedgerAdapter } from './ledger-adapter.js';

export async function executeWithLedger(
    workflowId: string,
    adapter: LedgerAdapter,
    steps: Array<{ id: string, execute: () => Promise<void> }>
): Promise<void> {
    const isEnabled = process.env.SUMMIT_LEDGER_V1 === 'on';

    if (isEnabled) {
        adapter.recordEvent(workflowId, 'workflow.started', { msg: 'Starting workflow' });
    }

    for (const step of steps) {
        if (isEnabled) {
            adapter.recordEvent(workflowId, 'step.started', {}, step.id);
        }

        try {
            await step.execute();
            if (isEnabled) {
                adapter.recordEvent(workflowId, 'step.succeeded', {}, step.id);
            }
        } catch (error: any) {
            if (isEnabled) {
                adapter.recordEvent(workflowId, 'step.failed', { error: error.message }, step.id);
            }
            // Propagate if needed, or handle
            throw error;
        }
    }

    if (isEnabled) {
        adapter.recordEvent(workflowId, 'workflow.completed', {});
    }
}
