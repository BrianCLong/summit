import { randomUUID } from 'crypto';
import type { JSONValue, ProvenanceEntry } from './types.js';

function toJsonValue(input: unknown): JSONValue {
  if (
    input === null ||
    typeof input === 'string' ||
    typeof input === 'number' ||
    typeof input === 'boolean'
  ) {
    return input as JSONValue;
  }
  if (Array.isArray(input)) {
    return input.map((value) => toJsonValue(value)) as JSONValue;
  }
  if (typeof input === 'object' && input !== null) {
    const record: Record<string, JSONValue> = {};
    for (const [key, value] of Object.entries(input)) {
      record[key] = toJsonValue(value);
    }
    return record as JSONValue;
  }
  return String(input) as JSONValue;
}

export class ProvenanceLedger {
  private entries: ProvenanceEntry[] = [];

  record(actor: string, action: string, details: unknown): ProvenanceEntry {
    const entry: ProvenanceEntry = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      actor,
      action,
      details: toJsonValue(details),
    };
    this.entries.push(entry);
    return entry;
  }

  list(): ProvenanceEntry[] {
    return [...this.entries];
  }

  clear(): void {
    this.entries = [];
  }
}

export const provenanceLedger = new ProvenanceLedger();
