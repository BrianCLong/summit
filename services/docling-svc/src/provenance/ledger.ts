import crypto from 'crypto';
import { randomUUID } from 'crypto';
import EventEmitter from 'events';
import { ProvenanceMetadata } from '../types.js';

export interface ProvenanceEvent extends ProvenanceMetadata {
  tenantId: string;
  purpose: string;
  retention: string;
  sourceHash: string;
  outputHash: string;
  auditTrail: Record<string, unknown>;
}

class ProvenanceEmitter extends EventEmitter {
  emitEvent(event: ProvenanceEvent): void {
    this.emit('provenance', event);
  }

  record(
    base: Omit<ProvenanceMetadata, 'promptHash' | 'timestamp'> & {
      tenantId: string;
      purpose: string;
      retention: string;
      input: unknown;
      output: unknown;
    },
  ): ProvenanceEvent {
    const timestamp = new Date().toISOString();
    const sourceHash = hash(base.input);
    const outputHash = hash(base.output);

    const event: ProvenanceEvent = {
      ...base,
      promptHash: hash({ model: base.modelId, parameters: base.parameters }),
      timestamp,
      tenantId: base.tenantId,
      purpose: base.purpose,
      retention: base.retention,
      sourceHash,
      outputHash,
      auditTrail: {
        ledgerId: randomUUID(),
        version: '1.0',
        issuedAt: timestamp,
      },
    };

    this.emitEvent(event);
    return event;
  }
}

const hash = (input: unknown): string => {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(input))
    .digest('hex');
};

export const provenanceEmitter = new ProvenanceEmitter();
