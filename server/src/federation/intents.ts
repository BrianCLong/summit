import { ShardManager } from '../graph/partition/ShardManager.js';
import { provenanceLedger } from '../provenance/ledger.js';
import { jobManager } from '../jobs/job.manager.js';
import { QueueNames } from '../jobs/job.definitions.js';
import { randomUUID } from 'crypto';
import logger from '../utils/logger.js';

export type IntentOp = 'UPSERT_NODE' | 'UPSERT_EDGE' | 'DELETE';

export interface WriteIntent {
  id: string;
  shardId: string;
  actorId: string;
  ts: number;
  op: IntentOp;
  payload: Record<string, unknown>;
  policyTags: string[]; // residency, audience, etc.
}

export class IntentService {
  private static instance: IntentService;

  private constructor() {}

  public static getInstance(): IntentService {
    if (!IntentService.instance) {
      IntentService.instance = new IntentService();
    }
    return IntentService.instance;
  }

  // Enqueue the intent for asynchronous processing
  public async enqueueIntent(
    shardId: string,
    actorId: string,
    op: IntentOp,
    payload: Record<string, unknown>,
    policyTags: string[] = []
  ): Promise<string> {
    const id = randomUUID();
    const intent: WriteIntent = {
      id,
      shardId,
      actorId,
      ts: Date.now(),
      op,
      payload,
      policyTags
    };

    const queue = jobManager.getQueue(QueueNames.INTENTS);
    if (!queue) {
      throw new Error(`Queue ${QueueNames.INTENTS} not initialized`);
    }

    await queue.add('process-intent', intent, {
      jobId: id,
      removeOnComplete: true
    });
    
    logger.info({ intentId: id, op, shardId }, 'Intent enqueued');
    return id;
  }

  // Apply the intent (executed by worker)
  public async applyIntent(intent: WriteIntent): Promise<any> {
    logger.info({ intentId: intent.id }, 'Applying intent');

    // 1. Policy Check (Mock)
    await this.checkPolicy(intent);

    // 2. Get Shard Driver
    const shardManager = ShardManager.getInstance();
    const driver = shardManager.getDriver(intent.shardId);
    if (!driver) {
      throw new Error(`Shard ${intent.shardId} not found or not connected`);
    }

    // 3. Apply Transactional Write
    const session = driver.session();
    let result;
    try {
      result = await session.executeWrite(async (tx: any) => {
        if (intent.op === 'UPSERT_NODE') {
          // Simple generic node upsert
          const { labels, properties, keyField, keyValue } = intent.payload as any;
          if (!labels || !keyField || !keyValue) {
             throw new Error("Invalid UPSERT_NODE payload: missing labels, keyField, or keyValue");
          }
          this.validateIdentifier(keyField);
          const labelList = Array.isArray(labels) ? labels : [labels];
          labelList.forEach(l => this.validateIdentifier(l));

          const labelStr = labelList.map(l => `\`${l}\``).join(':');
          const query = `
            MERGE (n:${labelStr} { ${keyField}: $keyValue })
            SET n += $properties
            RETURN n
          `;
          return await tx.run(query, { keyValue, properties });
        } else if (intent.op === 'UPSERT_EDGE') {
           // Simple generic edge upsert
           const { fromKey, toKey, type, properties, fromKeyField, toKeyField } = intent.payload as any;
           if (!fromKey || !toKey || !type) {
             throw new Error("Invalid UPSERT_EDGE payload: missing fromKey, toKey, or type");
           }
           this.validateIdentifier(type);
           
           // Use provided key fields or default to 'id'
           const fKey = fromKeyField || 'id';
           const tKey = toKeyField || 'id';
           this.validateIdentifier(fKey);
           this.validateIdentifier(tKey);

           const query = `
             MATCH (a), (b)
             WHERE a.${fKey} = $fromKey AND b.${tKey} = $toKey
             MERGE (a)-[r:\`${type}\`]->(b)
             SET r += $properties
             RETURN r
           `;
           return await tx.run(query, { fromKey, toKey, properties });
        } else if (intent.op === 'DELETE') {
            const { keyField, keyValue } = intent.payload as any;
            if (!keyField || !keyValue) {
                throw new Error("Invalid DELETE payload: missing keyField or keyValue");
            }
            this.validateIdentifier(keyField);

            const query = `
              MATCH (n { ${keyField}: $keyValue })
              DETACH DELETE n
            `;
            return await tx.run(query, { keyValue });
        }
        throw new Error(`Unsupported operation: ${intent.op}`);
      });
    } finally {
      await session.close();
    }

    // 4. Record Provenance
    await provenanceLedger.appendEntry({
      tenantId: 'system', // TODO: derive from intent or actor
      actionType: 'INTENT_APPLIED',
      resourceType: 'GraphEntity',
      resourceId: intent.id,
      actorId: intent.actorId,
      actorType: 'user', // or system
      timestamp: new Date(),
      payload: {
        mutationType: intent.op === 'DELETE' ? 'DELETE' : 'UPDATE',
        entityId: (intent.payload as any)?.id || intent.id,
        entityType: (intent.payload as any)?.type || 'GraphEntity',
        intentId: intent.id,
        shardId: intent.shardId,
        op: intent.op,
        status: 'SUCCESS'
      } as any,
      metadata: { policyTags: intent.policyTags }
    });

    return result;
  }

  private async checkPolicy(intent: WriteIntent): Promise<void> {
    // Mock Policy Check
    // In a real scenario, call OPA or similar.
    // For now, fail if policyTags includes 'deny-all'
    if (intent.policyTags.includes('deny-all')) {
      throw new Error('POLICY_DENY: deny-all tag present');
    }
    // TODO: Add more sophisticated logic
  }

  private validateIdentifier(value: string): void {
      if (!/^[a-zA-Z0-9_]+$/.test(value)) {
          throw new Error(`Invalid identifier: ${value}. Must be alphanumeric/underscore only.`);
      }
  }
}
