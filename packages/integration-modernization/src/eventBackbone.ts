import { createHmac } from 'crypto';
import { DeliveryStatus, EventRecord, SchemaDefinition } from './types';

export type DeliveryOptions = {
  maxAttempts: number;
  baseBackoffMs: number;
  quotaPerTenant: number;
  signatureSecret: string;
};

export class EventBackbone {
  private schemas: Map<string, SchemaDefinition[]> = new Map();
  private events: EventRecord[] = [];
  private dlq: EventRecord[] = [];
  private processed: Map<string, number> = new Map();
  private options: DeliveryOptions;

  constructor(options: DeliveryOptions) {
    this.options = options;
  }

  registerSchema(schema: SchemaDefinition) {
    const versions = this.schemas.get(schema.name) ?? [];
    const latest = versions.at(-1);
    if (latest) {
      const missingFields = latest.requiredFields.filter((field) => !schema.requiredFields.includes(field));
      if (missingFields.length) {
        throw new Error(`Schema ${schema.name} ${schema.version} incompatible; missing ${missingFields.join(',')}`);
      }
    }
    this.schemas.set(schema.name, [...versions, schema]);
  }

  signPayload(payload: Record<string, unknown>): string {
    const serialized = JSON.stringify(payload);
    return createHmac('sha256', this.options.signatureSecret).update(serialized).digest('hex');
  }

  async publish(
    tenantId: string,
    name: string,
    payload: Record<string, unknown>,
    idempotencyKey: string,
    consumer: (event: EventRecord) => Promise<boolean>
  ): Promise<DeliveryStatus> {
    const key = `${tenantId}:${idempotencyKey}`;
    const lastProcessed = this.processed.get(key);
    if (lastProcessed && Date.now() - lastProcessed < this.options.baseBackoffMs * this.options.maxAttempts) {
      return 'delivered';
    }
    const eventsByTenant = this.events.filter((event) => event.tenantId === tenantId && event.timestamp > Date.now() - 60000);
    if (eventsByTenant.length >= this.options.quotaPerTenant) {
      throw new Error('Tenant quota exceeded');
    }
    const record: EventRecord = {
      tenantId,
      name,
      payload,
      idempotencyKey,
      timestamp: Date.now(),
      status: 'pending',
      attempts: 0
    };
    this.events.push(record);
    return this.deliver(record, consumer);
  }

  private async deliver(record: EventRecord, consumer: (event: EventRecord) => Promise<boolean>): Promise<DeliveryStatus> {
    let attempt = 0;
    while (attempt < this.options.maxAttempts) {
      attempt += 1;
      record.attempts = attempt;
      const accepted = await consumer(record);
      if (accepted) {
        record.status = 'delivered';
        this.processed.set(`${record.tenantId}:${record.idempotencyKey}`, Date.now());
        return record.status;
      }
      await new Promise((resolve) => setTimeout(resolve, this.options.baseBackoffMs * attempt));
    }
    record.status = 'dead-lettered';
    this.dlq.push(record);
    return record.status;
  }

  replay(tenantId: string, since: number, until: number, consumer: (event: EventRecord) => Promise<boolean>) {
    const subset = this.events.filter(
      (event) => event.tenantId === tenantId && event.timestamp >= since && event.timestamp <= until
    );
    return Promise.all(subset.map((event) => this.deliver({ ...event, status: 'pending', attempts: 0 }, consumer)));
  }

  explorer(tenantId: string) {
    return this.events.filter((event) => event.tenantId === tenantId).map(({ payload, ...rest }) => ({
      ...rest,
      payload,
      signature: this.signPayload(payload)
    }));
  }

  deadLetterQueue() {
    return [...this.dlq];
  }
}
