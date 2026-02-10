import { createHash } from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import { ActionReceipt, ActionReceiptSchema } from './models/action-receipt.js';

export class ActionReceiptGenerator {
  public static generate(params: {
    actor: { identity: string; tenant: string };
    tool: { capability: string; action: string; inputs: any };
    policy: { decision: 'allow' | 'deny'; reason?: string; budget?: { allocated: number; consumed: number } };
    outputs?: any;
  }): ActionReceipt {
    const id = uuidv4();
    const timestamp = new Date().toISOString();

    const inputs_digest = this.computeDigest(params.tool.inputs);
    const outputs_digest = params.outputs ? this.computeDigest(params.outputs) : undefined;

    const receiptContent: Omit<ActionReceipt, 'hash'> = {
      version: '1',
      id,
      timestamp,
      actor: params.actor,
      tool: {
        capability: params.tool.capability,
        action: params.tool.action,
        inputs_digest,
        outputs_digest,
      },
      policy: {
        decision: params.policy.decision,
        reason: params.policy.reason,
        budget: params.policy.budget ? {
          ...params.policy.budget,
          currency: 'USD'
        } : undefined,
      },
    };

    const hash = this.computeReceiptHash(receiptContent);

    const receipt: ActionReceipt = {
      ...receiptContent,
      hash,
    };

    // Validate against schema
    return ActionReceiptSchema.parse(receipt);
  }

  public static verify(receipt: ActionReceipt): boolean {
    const { hash, ...content } = receipt;
    const recomputedHash = this.computeReceiptHash(content);
    return hash === recomputedHash;
  }

  private static computeDigest(data: any): string {
    const canonical = JSON.stringify(this.sortKeys(data));
    return createHash('sha256').update(canonical).digest('hex');
  }

  private static computeReceiptHash(content: any): string {
    const canonical = JSON.stringify(this.sortKeys(content));
    return createHash('sha256').update(canonical).digest('hex');
  }

  private static sortKeys(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this.sortKeys(item));
    }
    const sortedKeys = Object.keys(obj).sort();
    const result: any = {};
    for (const key of sortedKeys) {
      result[key] = this.sortKeys(obj[key]);
    }
    return result;
  }
}
