// maestro-conductor/src/workflows/trial-upsell-dag.ts
import { evaluateUpsell, trackUpsellConversion } from '../../../../../packages/agents/src/upsell/trial-upsell';

export interface WorkflowResult {
  tenantId: string;
  status: 'no-action' | 'upsell-triggered';
  signal?: any;
}

/**
 * Trial Upsell DAG
 * 1. Poll Metrics (handled by evaluateUpsell internally for now)
 * 2. Evaluate Upsell logic
 * 3. If triggered: Notify + Log
 */
export async function runTrialUpsellWorkflow(tenantId: string): Promise<WorkflowResult> {
  console.log(`[DAG] Starting Trial Upsell Workflow for tenant: ${tenantId}`);

  const signal = await evaluateUpsell(tenantId);

  if (signal) {
    console.log(`[DAG] Upsell Triggered for ${tenantId}: ${signal.msg} (Variant: ${signal.variant})`);

    // Simulate notification (Email, Dashboard nudge)
    await notifyTenant(tenantId, signal);

    // Track that we showed the nudge
    await trackUpsellConversion(tenantId, signal.variant, 'nudge_shown');

    return {
      tenantId,
      status: 'upsell-triggered',
      signal
    };
  }

  console.log(`[DAG] No upsell action needed for tenant: ${tenantId}`);
  return {
    tenantId,
    status: 'no-action'
  };
}

async function notifyTenant(tenantId: string, signal: any) {
  // In real world, this would call a notification service
  console.log(`[Notification] To Tenant ${tenantId}: ${signal.msg} [Link: ${signal.link}]`);

  // Graph annotation simulation
  console.log(`[Graph] Adding watermark annotation for ${tenantId}: Upsell Nudge ${signal.variant}`);
}
