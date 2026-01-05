import { ReceiptService, type Receipt } from '../ReceiptService.js';
import {
  quotaPolicyRules,
  type QuotaPolicyRuleKey,
  type QuotaPolicyDecision,
} from '../../policies/quota.js';

export type QuotaDenialReceiptInput = {
  tenantId: string;
  actorId: string;
  ruleKey: QuotaPolicyRuleKey;
  decision: QuotaPolicyDecision;
  resource: string;
  metadata?: Record<string, unknown>;
};

export async function emitQuotaDenialReceipt(
  input: QuotaDenialReceiptInput,
): Promise<Receipt> {
  const rule = quotaPolicyRules[input.ruleKey];
  const receiptService = ReceiptService.getInstance();

  return receiptService.generateReceipt(
    {
      action: 'quota.denied',
      actor: { id: input.actorId, tenantId: input.tenantId },
      resource: input.resource,
      input: {
        ruleId: rule.id,
        reason: input.decision.reason || rule.reason,
        limit: input.decision.limit,
        used: input.decision.used,
        remaining: input.decision.remaining,
        retryAfterMs: input.decision.retryAfterMs,
        metadata: input.metadata,
      },
    },
    { bypassQuota: true },
  );
}
