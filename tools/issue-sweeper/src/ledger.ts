import { promises as fs } from 'fs';
import path from 'path';

const STATE_FILE = 'STATE.json';
const LEDGER_FILE = 'LEDGER.ndjson';

export interface State {
  repo: string;
  state_filter: 'all' | 'open' | 'closed';
  batch_size: number;
  cursor: number | string; // Can be page number or last issue number
  last_processed_issue_number: number;
  run_started_at: string;
  run_updated_at: string;
  processed_count: number;
  error_count: number;
  failures: {
    issue_number: number;
    step: string;
    error_message: string;
    timestamp: string;
  }[];
  open_prs: {
    issue_number: number;
    pr_url: string;
    timestamp: string;
  }[];
}

export type IssueClassification = 'bug' | 'feature' | 'docs' | 'question' | 'security' | 'ci' | 'perf' | 'refactor' | 'unknown';
export type SolvedStatus = 'already_solved' | 'solved_in_this_run' | 'not_solved' | 'blocked' | 'duplicate' | 'invalid';

export interface LedgerEntry {
  issue_number: number;
  title: string;
  url: string;
  state: 'open' | 'closed';
  labels: string[];
  updatedAt: string;
  createdAt: string;
  classification: IssueClassification;
  solved_status: SolvedStatus;
  evidence: {
    prs: { number: number; url: string; mergedAt: string | null; title: string }[];
    commits: { sha: string; url: string; message: string }[];
    paths: { path: string; reason: string }[];
    tests: { name: string; command: string }[];
  };
  actions_taken: string[];
  verification: string[];
  notes: string;
  run_id: string;
}

export class Ledger {
  private readonly toolsDir: string;
  private readonly stateFilePath: string;
  private readonly ledgerFilePath: string;
  private ledgerEntries: Map<number, LedgerEntry> = new Map(); // For idempotency check

  constructor(toolsDir: string) {
    this.toolsDir = toolsDir;
    this.stateFilePath = path.join(toolsDir, STATE_FILE);
    this.ledgerFilePath = path.join(toolsDir, LEDGER_FILE);
  }

  async loadState(): Promise<State | null> {
    try {
      const content = await fs.readFile(this.stateFilePath, 'utf-8');
      return JSON.parse(content) as State;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null; // File does not exist
      }
      console.error('Error loading state file:', error);
      throw error;
    }
  }

  async saveState(state: State): Promise<void> {
    await fs.writeFile(this.stateFilePath, JSON.stringify(state, null, 2), 'utf-8');
  }

  async loadLedger(): Promise<void> {
    this.ledgerEntries.clear();
    try {
      const content = await fs.readFile(this.ledgerFilePath, 'utf-8');
      content.split('\n').forEach(line => {
        if (line.trim()) {
          const entry: LedgerEntry = JSON.parse(line);
          this.ledgerEntries.set(entry.issue_number, entry);
        }
      });
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // Ledger file does not exist, start fresh
        return;
      }
      console.error('Error loading ledger file:', error);
      throw error;
    }
  }

  async appendLedgerEntry(entry: LedgerEntry): Promise<void> {
    if (this.ledgerEntries.has(entry.issue_number)) {
      console.warn(`Issue #${entry.issue_number} already exists in ledger. Skipping append.`);
      // Optionally, update the existing entry or log a specific message
      return;
    }
    await fs.appendFile(this.ledgerFilePath, JSON.stringify(entry) + '\n', 'utf-8');
    this.ledgerEntries.set(entry.issue_number, entry);
  }

  getLedgerEntry(issueNumber: number): LedgerEntry | undefined {
    return this.ledgerEntries.get(issueNumber);
  }

  getAllLedgerEntries(): LedgerEntry[] {
    return Array.from(this.ledgerEntries.values());
  }

  async resetState(): Promise<void> {
    try {
      await fs.unlink(this.stateFilePath);
      console.log('STATE.json reset.');
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.error('Error resetting state file:', error);
        throw error;
      }
    }
  }

  async resetLedger(): Promise<void> {
    try {
      await fs.unlink(this.ledgerFilePath);
      this.ledgerEntries.clear();
      console.log('LEDGER.ndjson reset.');
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.error('Error resetting ledger file:', error);
        throw error;
      }
    }
  }
}
