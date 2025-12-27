import fs from 'node:fs';
import path from 'node:path';
import { sha256Hex, canonicalJson } from './hashing.js';
import type { Attestation } from './types.js';

export type LedgerAppendInput = Omit<Attestation, 'hash' | 'prev_hash'> & {
  prev_hash?: string;
};

export class AppendOnlyLedger {
  constructor(private readonly ledgerPath: string) {}

  ensureDir(): void {
    fs.mkdirSync(path.dirname(this.ledgerPath), { recursive: true });
  }

  readLastHash(): string | undefined {
    if (!fs.existsSync(this.ledgerPath)) return undefined;
    const content = fs.readFileSync(this.ledgerPath, 'utf8').trim();
    if (!content) return undefined;
    const lastLine = content.split('\n').pop();
    if (!lastLine) return undefined;
    const last = JSON.parse(lastLine) as Attestation;
    return last.hash;
  }

  append(entry: LedgerAppendInput): Attestation {
    this.ensureDir();
    const prev_hash = entry.prev_hash ?? this.readLastHash();
    const withoutHash: Omit<Attestation, 'hash'> = {
      ...entry,
      prev_hash
    } as Attestation;

    const hash = sha256Hex(canonicalJson(withoutHash));
    const full: Attestation = { ...(withoutHash as Attestation), hash };

    fs.appendFileSync(this.ledgerPath, `${JSON.stringify(full)}\n`, 'utf8');
    return full;
  }
}
