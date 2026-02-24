import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface LedgerEntry {
  index: number;
  timestamp: string;
  previousHash: string;
  data: any;
  hash: string;
}

const LEDGER_FILE = process.env.LEDGER_FILE || 'ledger.json';

export class EvidenceLedger {
  private entries: LedgerEntry[] = [];
  private filePath: string;

  constructor(filePath: string = LEDGER_FILE) {
    this.filePath = path.resolve(process.cwd(), filePath);
    this.load();
  }

  private load() {
    if (fs.existsSync(this.filePath)) {
      try {
        const content = fs.readFileSync(this.filePath, 'utf-8');
        this.entries = JSON.parse(content);
      } catch (e) {
        console.error('Failed to load ledger:', e);
        this.entries = [];
      }
    } else {
      this.entries = [];
    }
  }

  private save() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.entries, null, 2));
  }

  private calculateHash(data: any): string {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  public append(data: any): LedgerEntry {
    const index = this.entries.length;
    const previousHash = index > 0 ? this.entries[index - 1].hash : '0000000000000000000000000000000000000000000000000000000000000000';
    const timestamp = new Date().toISOString();

    // Hash includes index, timestamp, previousHash, and data
    const entryContent = {
      index,
      timestamp,
      previousHash,
      data
    };

    const hash = this.calculateHash(entryContent);

    const entry: LedgerEntry = {
      ...entryContent,
      hash
    };

    this.entries.push(entry);
    this.save();
    return entry;
  }

  public getEntry(index: number): LedgerEntry | undefined {
    return this.entries[index];
  }

  public getEntryByHash(hash: string): LedgerEntry | undefined {
    return this.entries.find(e => e.hash === hash);
  }

  public verifyIntegrity(): boolean {
    if (this.entries.length === 0) return true;

    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      const previousHash = i > 0 ? this.entries[i - 1].hash : '0000000000000000000000000000000000000000000000000000000000000000';

      if (entry.previousHash !== previousHash) {
        console.error(`Integrity check failed at index ${i}: previousHash mismatch`);
        return false;
      }

      const entryContent = {
        index: entry.index,
        timestamp: entry.timestamp,
        previousHash: entry.previousHash,
        data: entry.data
      };

      const calculatedHash = this.calculateHash(entryContent);
      if (entry.hash !== calculatedHash) {
        console.error(`Integrity check failed at index ${i}: hash mismatch`);
        return false;
      }
    }
    return true;
  }
}

export const ledger = new EvidenceLedger();
