/**
 * Ledger storage with idempotency - manages durable state and issue records
 */

import { readFile, writeFile, mkdir, readdir, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import type { LedgerEntry, RunState } from './types.js';

export class Ledger {
  private ledgerDir: string;
  private stateFile: string;
  private ndjsonFile: string;
  private logger: any;

  constructor(baseDir: string, logger?: any) {
    this.ledgerDir = join(baseDir, 'ledger');
    this.stateFile = join(baseDir, 'STATE.json');
    this.ndjsonFile = join(baseDir, 'LEDGER.ndjson');
    this.logger = logger || console;
  }

  /**
   * Initialize ledger directory structure
   */
  async initialize(): Promise<void> {
    if (!existsSync(this.ledgerDir)) {
      await mkdir(this.ledgerDir, { recursive: true });
      this.logger.info(`Created ledger directory: ${this.ledgerDir}`);
    }
  }

  /**
   * Load run state from disk (or create new)
   */
  async loadState(config: {
    repo: string;
    stateFilter: 'all' | 'open' | 'closed';
    batchSize: number;
    runId: string;
  }): Promise<RunState> {
    if (existsSync(this.stateFile)) {
      try {
        const content = await readFile(this.stateFile, 'utf-8');
        const state = JSON.parse(content) as RunState;
        this.logger.info(`Loaded existing state: ${state.processed_count} issues processed`);
        return state;
      } catch (error: any) {
        this.logger.warn(`Failed to load state file: ${error.message}. Creating new state.`);
      }
    }

    // Create new state
    const newState: RunState = {
      repo: config.repo,
      state_filter: config.stateFilter,
      batch_size: config.batchSize,
      cursor: null,
      last_processed_issue_number: null,
      run_started_at: new Date().toISOString(),
      run_updated_at: new Date().toISOString(),
      run_id: config.runId,
      processed_count: 0,
      error_count: 0,
      failures: [],
      open_prs: [],
    };

    this.logger.info('Created new run state');
    return newState;
  }

  /**
   * Save run state to disk
   */
  async saveState(state: RunState): Promise<void> {
    state.run_updated_at = new Date().toISOString();
    await writeFile(this.stateFile, JSON.stringify(state, null, 2), 'utf-8');
  }

  /**
   * Reset state file
   */
  async resetState(): Promise<void> {
    if (existsSync(this.stateFile)) {
      await writeFile(this.stateFile, '', 'utf-8');
      this.logger.info('State file reset');
    }
  }

  /**
   * Check if an issue has been processed (idempotency check)
   */
  async hasIssue(issueNumber: number): Promise<boolean> {
    const filePath = this.getIssueFilePath(issueNumber);
    return existsSync(filePath);
  }

  /**
   * Get existing ledger entry for an issue
   */
  async getEntry(issueNumber: number): Promise<LedgerEntry | null> {
    const filePath = this.getIssueFilePath(issueNumber);

    if (!existsSync(filePath)) {
      return null;
    }

    try {
      const content = await readFile(filePath, 'utf-8');
      return JSON.parse(content) as LedgerEntry;
    } catch (error: any) {
      this.logger.error(`Failed to read ledger entry for issue #${issueNumber}: ${error.message}`);
      return null;
    }
  }

  /**
   * Save or update a ledger entry (idempotent)
   */
  async saveEntry(entry: LedgerEntry): Promise<void> {
    const filePath = this.getIssueFilePath(entry.issue_number);
    const dir = dirname(filePath);

    // Ensure directory exists
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    // Write entry to file
    await writeFile(filePath, JSON.stringify(entry, null, 2), 'utf-8');
  }

  /**
   * Load all ledger entries
   */
  async loadAllEntries(): Promise<LedgerEntry[]> {
    if (!existsSync(this.ledgerDir)) {
      return [];
    }

    const entries: LedgerEntry[] = [];
    const files = await readdir(this.ledgerDir);

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const filePath = join(this.ledgerDir, file);
          const content = await readFile(filePath, 'utf-8');
          const entry = JSON.parse(content) as LedgerEntry;
          entries.push(entry);
        } catch (error: any) {
          this.logger.warn(`Failed to read ledger file ${file}: ${error.message}`);
        }
      }
    }

    return entries.sort((a, b) => a.issue_number - b.issue_number);
  }

  /**
   * Generate NDJSON file from individual ledger entries
   */
  async generateNDJSON(): Promise<void> {
    const entries = await this.loadAllEntries();

    const lines = entries.map((entry) => JSON.stringify(entry)).join('\n');

    await writeFile(this.ndjsonFile, lines + '\n', 'utf-8');
    this.logger.info(`Generated NDJSON with ${entries.length} entries`);
  }

  /**
   * Reset ledger (dangerous operation)
   */
  async resetLedger(): Promise<void> {
    if (existsSync(this.ledgerDir)) {
      const files = await readdir(this.ledgerDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = join(this.ledgerDir, file);
          await writeFile(filePath, '', 'utf-8');
        }
      }
      this.logger.warn('Ledger reset - all entries cleared');
    }

    if (existsSync(this.ndjsonFile)) {
      await writeFile(this.ndjsonFile, '', 'utf-8');
    }
  }

  /**
   * Get statistics from ledger
   */
  async getStats(): Promise<{
    total: number;
    bySolvedStatus: Record<string, number>;
    byClassification: Record<string, number>;
  }> {
    const entries = await this.loadAllEntries();

    const stats = {
      total: entries.length,
      bySolvedStatus: {} as Record<string, number>,
      byClassification: {} as Record<string, number>,
    };

    for (const entry of entries) {
      // Count by solved status
      stats.bySolvedStatus[entry.solved_status] =
        (stats.bySolvedStatus[entry.solved_status] || 0) + 1;

      // Count by classification
      stats.byClassification[entry.classification] =
        (stats.byClassification[entry.classification] || 0) + 1;
    }

    return stats;
  }

  /**
   * Get file path for an issue's ledger entry
   */
  private getIssueFilePath(issueNumber: number): string {
    // Pad issue number to 5 digits for nice sorting
    const paddedNumber = issueNumber.toString().padStart(5, '0');
    return join(this.ledgerDir, `${paddedNumber}.json`);
  }

  /**
   * Get size of ledger directory
   */
  async getSize(): Promise<{ files: number; bytes: number }> {
    if (!existsSync(this.ledgerDir)) {
      return { files: 0, bytes: 0 };
    }

    const files = await readdir(this.ledgerDir);
    let totalBytes = 0;

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = join(this.ledgerDir, file);
        const stats = await stat(filePath);
        totalBytes += stats.size;
      }
    }

    return { files: files.length, bytes: totalBytes };
  }
}
