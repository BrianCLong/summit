import { createHash, randomUUID } from 'crypto';

export interface ChainEvent {
  id: string;
  type: string;
  payload: any;
  prevHash: string;
  hash: string;
  timestamp: string;
  version: string;
}

/**
 * Deterministically stringifies an object or array by sorting keys alphabetically.
 */
export function canonicalSerialize(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map(item => canonicalSerialize(item)).join(',') + ']';
  }

  const sortedKeys = Object.keys(obj).sort();
  const parts = sortedKeys.map(key => {
    return JSON.stringify(key) + ':' + canonicalSerialize(obj[key]);
  });

  return '{' + parts.join(',') + '}';
}

export class HashChain {
  private currentHash: string;
  private readonly algorithm = 'sha256';
  private readonly version = '2.1.0';

  constructor(genesisHash: string = '0'.repeat(64)) {
    this.currentHash = genesisHash;
  }

  public createEvent(type: string, payload: any): ChainEvent {
    const id = randomUUID();
    const timestamp = new Date().toISOString();
    const prevHash = this.currentHash;

    const payloadHash = createHash(this.algorithm)
      .update(canonicalSerialize(payload))
      .digest('hex');

    const contentToHash = canonicalSerialize({
      id,
      type,
      payloadHash,
      prevHash,
      timestamp,
      version: this.version
    });

    const hash = createHash(this.algorithm).update(contentToHash).digest('hex');
    this.currentHash = hash;

    return {
      id,
      type,
      payload,
      prevHash,
      hash,
      timestamp,
      version: this.version
    };
  }

  public verifyEvent(event: ChainEvent, expectedPrevHash: string): boolean {
    const payloadHash = createHash(this.algorithm)
      .update(canonicalSerialize(event.payload))
      .digest('hex');

    const contentToHash = canonicalSerialize({
      id: event.id,
      type: event.type,
      payloadHash,
      prevHash: expectedPrevHash,
      timestamp: event.timestamp,
      version: event.version
    });

    const hash = createHash(this.algorithm).update(contentToHash).digest('hex');
    return hash === event.hash;
  }

  public getHead(): string {
    return this.currentHash;
  }

  public setHead(hash: string): void {
    this.currentHash = hash;
  }
}
