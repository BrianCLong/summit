import { Receipt, ReceiptService } from './ReceiptService.js';
import logger from '../config/logger.js';
import {
  RetentionAction,
  RetentionPolicy,
  RetentionPolicySchema,
  RetentionRule,
} from '../policies/retentionPolicy.js';

export interface RetentionRunContext {
  actorId: string;
  tenantId: string;
  runId?: string;
}

export interface RetentionActionResult {
  ruleId: string;
  action: RetentionAction;
  resource: string;
  cutoff: string;
  affectedCount: number;
  receipt: Receipt;
}

export interface RetentionRunResult {
  policyId: string;
  policyVersion: string;
  results: RetentionActionResult[];
}

export class RetentionActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RetentionActionError';
  }
}

export interface RetentionStore {
  deleteExpired(rule: RetentionRule, cutoff: Date): Promise<number>;
  archiveExpired(rule: RetentionRule, cutoff: Date): Promise<number>;
  anonymizeExpired(rule: RetentionRule, cutoff: Date): Promise<number>;
}

type ReceiptWriter = Pick<ReceiptService, 'generateReceipt'>;

const actionToReceiptName = (action: RetentionAction) =>
  `RETENTION_${action}`;

export class RetentionJobService {
  private receipts: ReceiptWriter;

  constructor(
    private store: RetentionStore,
    receipts: ReceiptWriter = ReceiptService.getInstance(),
  ) {
    this.receipts = receipts;
  }

  async runPolicy(
    policyInput: RetentionPolicy,
    context: RetentionRunContext,
  ): Promise<RetentionRunResult> {
    const policy = RetentionPolicySchema.parse(policyInput);
    const policyDecisionId = `${policy.metadata.id}@${policy.metadata.version}`;
    const results: RetentionActionResult[] = [];

    for (const rule of policy.rules) {
      const cutoff = new Date(
        Date.now() - rule.retentionDays * 24 * 60 * 60 * 1000,
      );
      const affectedCount = await this.applyRule(rule, cutoff);

      const receipt = await this.receipts.generateReceipt({
        action: actionToReceiptName(rule.action),
        actor: { id: context.actorId, tenantId: context.tenantId },
        resource: rule.resource.type,
        input: {
          policyId: policy.metadata.id,
          policyVersion: policy.metadata.version,
          ruleId: rule.id,
          action: rule.action,
          resource: rule.resource,
          cutoff: cutoff.toISOString(),
          affectedCount,
          runId: context.runId,
        },
        policyDecisionId,
      });

      results.push({
        ruleId: rule.id,
        action: rule.action,
        resource: rule.resource.type,
        cutoff: cutoff.toISOString(),
        affectedCount,
        receipt,
      });

      logger.info(
        {
          ruleId: rule.id,
          action: rule.action,
          affectedCount,
          policyId: policy.metadata.id,
          policyVersion: policy.metadata.version,
          receiptId: receipt.id,
        },
        'Retention action applied',
      );
    }

    return {
      policyId: policy.metadata.id,
      policyVersion: policy.metadata.version,
      results,
    };
  }

  private async applyRule(rule: RetentionRule, cutoff: Date): Promise<number> {
    switch (rule.action) {
      case 'DELETE':
        return this.store.deleteExpired(rule, cutoff);
      case 'ARCHIVE':
        return this.store.archiveExpired(rule, cutoff);
      case 'ANONYMIZE':
        return this.store.anonymizeExpired(rule, cutoff);
      default:
        throw new RetentionActionError(
          `Unsupported retention action: ${rule.action}`,
        );
    }
  }
}
