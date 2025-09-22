import { createHash, createHmac, randomUUID } from 'node:crypto';

import {
  PolicyMetadata,
  PolicyTag,
  ProvenanceRecord,
} from '@ga-graphai/common-types';

export interface ProvenanceRecordInput {
  reqId: string;
  step: ProvenanceRecord['step'];
  input: unknown;
  output: unknown;
  modelId: string;
  ckpt: string;
  prompt: string;
  params: Record<string, unknown>;
  policy: PolicyMetadata;
  scores?: ProvenanceRecord['scores'];
  tags?: PolicyTag[];
  startedAt?: Date;
  completedAt?: Date;
}

export interface SignedProvenanceRecord {
  record: ProvenanceRecord;
  signature: string;
}

export function hashPayload(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function hashPrompt(prompt: string): string {
  return createHash('sha256').update(prompt).digest('hex');
}

function toIso(timestamp: Date): string {
  return timestamp.toISOString();
}

export function createProvenanceRecord(input: ProvenanceRecordInput): ProvenanceRecord {
  const start = input.startedAt ?? new Date();
  const end = input.completedAt ?? start;
  return {
    reqId: input.reqId,
    step: input.step,
    inputHash: hashPayload(input.input),
    outputHash: hashPayload(input.output),
    modelId: input.modelId,
    ckpt: input.ckpt,
    promptHash: hashPrompt(input.prompt),
    params: input.params,
    scores: input.scores ?? {},
    policy: input.policy,
    time: {
      start: toIso(start),
      end: toIso(end),
    },
    tags: input.tags,
  };
}

export function signRecord(record: ProvenanceRecord, secret: string): SignedProvenanceRecord {
  const payload = JSON.stringify(record);
  const signature = createHmac('sha256', secret).update(payload).digest('hex');
  return { record, signature };
}

export function verifySignature(entry: SignedProvenanceRecord, secret: string): boolean {
  const expected = createHmac('sha256', secret)
    .update(JSON.stringify(entry.record))
    .digest('hex');
  return expected === entry.signature;
}

export class ProvenanceLedger {
  private readonly items = new Map<string, SignedProvenanceRecord[]>();
  private readonly secret: string;

  constructor(secret?: string) {
    this.secret = secret ?? randomUUID();
  }

  append(input: ProvenanceRecordInput): SignedProvenanceRecord {
    const record = createProvenanceRecord(input);
    const signed = signRecord(record, this.secret);
    const collection = this.items.get(record.reqId) ?? [];
    collection.push(signed);
    this.items.set(record.reqId, collection);
    return signed;
  }

  list(reqId?: string): SignedProvenanceRecord[] {
    if (!reqId) {
      return Array.from(this.items.values()).flat();
    }
    return [...(this.items.get(reqId) ?? [])];
  }

  verifyAll(secret?: string): boolean {
    const signerSecret = secret ?? this.secret;
    return this.list().every((entry) => verifySignature(entry, signerSecret));
  }

  getSecret(): string {
    return this.secret;
  }
}
