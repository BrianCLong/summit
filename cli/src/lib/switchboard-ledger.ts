/**
 * Switchboard Capsule Ledger
 *
 * Append-only JSONL ledger with hash chaining.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Redactor } from './redaction.js';

export interface LedgerEntry<T = Record<string, unknown>> {
  seq: number;
  timestamp: string;
  session_id: string;
  type: string;
  data: T;
  prev_hash: string;
  entry_hash: string;
}

export interface LedgerVerificationResult {
  valid: boolean;
  errors: string[];
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, val]) => val !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => `"${key}":${stableStringify(val)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}

export function computeEntryHash(payload: Record<string, unknown>): string {
  const data = stableStringify(payload);
  return crypto.createHash('sha256').update(data).digest('hex');
}

export class CapsuleLedger {
  private ledgerPath: string;
  private lastHash: string;
  private seq: number;
  private sessionId: string;
  private redactor?: Redactor;

  constructor(sessionDir: string, sessionId: string, redactor?: Redactor) {
    this.ledgerPath = path.join(sessionDir, 'ledger.jsonl');
    this.lastHash = 'GENESIS';
    this.seq = 0;
    this.sessionId = sessionId;
    this.redactor = redactor;
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  getLedgerPath(): string {
    return this.ledgerPath;
  }

  append<T = Record<string, unknown>>(type: string, data: T): LedgerEntry<T> {
    const timestamp = new Date().toISOString();

    // Redact data before logging and hashing
    const safeData = this.redactor ? this.redactor.redactObject(data) : data;

    const entryBase = {
      seq: this.seq + 1,
      timestamp,
      session_id: this.sessionId,
      type,
      data: safeData,
      prev_hash: this.lastHash,
    };
    const entryHash = computeEntryHash(entryBase);
    const entry: LedgerEntry<T> = {
      ...entryBase,
      entry_hash: entryHash,
    };
    fs.appendFileSync(this.ledgerPath, `${JSON.stringify(entry)}\n`, 'utf8');
    this.lastHash = entryHash;
    this.seq += 1;
    return entry;
  }
}

export function readLedgerEntries(ledgerPath: string): LedgerEntry[] {
  if (!fs.existsSync(ledgerPath)) {
    return [];
  }
  const lines = fs.readFileSync(ledgerPath, 'utf8').split('\n').filter(Boolean);
  return lines.map((line) => JSON.parse(line) as LedgerEntry);
}

export function verifyLedger(ledgerPath: string): LedgerVerificationResult {
  const entries = readLedgerEntries(ledgerPath);
  const errors: string[] = [];
  let prevHash = 'GENESIS';

  for (const entry of entries) {
    const { entry_hash, ...rest } = entry;
    if (entry.prev_hash !== prevHash) {
      errors.push(`Hash chain mismatch at seq ${entry.seq}`);
    }
    const recomputed = computeEntryHash(rest);
    if (recomputed !== entry_hash) {
      errors.push(`Entry hash mismatch at seq ${entry.seq}`);
    }
    prevHash = entry_hash;
  }

  return { valid: errors.length === 0, errors };
}
