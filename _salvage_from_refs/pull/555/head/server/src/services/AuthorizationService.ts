import { OpaClient } from './OpaClient.js';

export async function authorize(action: string, resource: { tenantId: string }, auth: any) {
  const decision = await OpaClient.evaluate('intelgraph/tenant', { action, resource, auth });
  if (!decision.allow) {
    throw new Error(decision.deny_reason || 'unauthorized');
  }
}
