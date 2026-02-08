import { CompanyOSClient } from '../../../../packages/companyos-sdk/src/index.js';

const client = new CompanyOSClient();
const ENFORCE = process.env.COMPANYOS_ENFORCE === '1';

export async function checkCompanyOSPolicy(
  tenantId: string,
  actorId: string,
  kind: 'FlowStart' | 'ToolInvoke',
  resource: string,
  context?: Record<string, any>
): Promise<{ allowed: boolean; reason?: string; auditEventId?: string }> {
  const result = await client.decide({
    tenantId,
    actorId,
    kind,
    resource,
    context,
  });

  const isDenied = result.decision === 'deny';
  const reason = result.reasons.join(', ');

  if (isDenied) {
    const message = `companyOS Policy Denial [${result.policyVersion}]: ${reason} (Audit: ${result.auditEventId})`;
    if (ENFORCE) {
      console.error(`[ENFORCE] ${message}`);
    } else {
      console.warn(`[ADVISORY] ${message}`);
    }
  }

  return {
    allowed: ENFORCE ? !isDenied : true,
    reason: isDenied ? reason : undefined,
    auditEventId: result.auditEventId,
  };
}
