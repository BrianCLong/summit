import { EventEnvelope, EventHandlingResult, EventSchema, EventSchemaField } from './types';

const isCompatible = (prev: EventSchemaField[], next: EventSchemaField[]) => {
  const prevRequired = prev.filter((f) => f.required).map((f) => f.name);
  const nextNames = new Set(next.map((f) => f.name));
  return prevRequired.every((field) => nextNames.has(field));
};

export class EventContractRegistry {
  private schemas = new Map<string, EventSchema[]>();
  private handledDedupeKeys = new Set<string>();
  private orderingState = new Map<string, number>();

  registerSchema(schema: EventSchema) {
    const versions = this.schemas.get(schema.name) || [];
    const latest = versions[versions.length - 1];
    if (latest && !isCompatible(latest.fields, schema.fields)) {
      throw new Error(`Schema for ${schema.name} is not backward compatible`);
    }
    versions.push(schema);
    this.schemas.set(schema.name, versions);
  }

  validateEnvelope(envelope: EventEnvelope): EventHandlingResult {
    const schemas = this.schemas.get(envelope.name);
    if (!schemas) throw new Error(`No schema registered for ${envelope.name}`);
    const schema = schemas.find((s) => s.version === envelope.version);
    if (!schema) throw new Error(`Schema version ${envelope.version} not found for ${envelope.name}`);

    const requiredFields = schema.fields.filter((f) => f.required);
    requiredFields.forEach((field) => {
      if (!(field.name in envelope.payload)) {
        throw new Error(`Missing required field ${field.name} for event ${envelope.name}`);
      }
    });

    if (!schema.piiSafe) {
      const containsPii = Object.keys(envelope.payload).some((key) => key.toLowerCase().includes('email'));
      if (containsPii) throw new Error(`Event ${envelope.name} payload failed PII hygiene check`);
    }

    const dedupeKey = envelope.dedupeKey || envelope.id;
    const idempotentHit = this.handledDedupeKeys.has(dedupeKey);
    if (idempotentHit) {
      return { idempotentHit: true, validated: true, ordered: true };
    }

    this.handledDedupeKeys.add(dedupeKey);

    const orderingKey = envelope.orderingKey || envelope.name;
    const lastSequence = this.orderingState.get(orderingKey) || 0;
    const ordered = envelope.sequence ? envelope.sequence >= lastSequence : true;
    this.orderingState.set(orderingKey, envelope.sequence || lastSequence + 1);

    return { idempotentHit, validated: true, ordered };
  }
}
