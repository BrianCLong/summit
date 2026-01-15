/**
 * State persistence and management
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { State, LedgerEntry } from './types.js';

// Determine the base directory (either running from repo root or from issue-sweeper dir)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const issueSweeperDir = join(__dirname, '..');

const STATE_FILE = join(issueSweeperDir, 'STATE.json');
const LEDGER_FILE = join(issueSweeperDir, 'LEDGER.ndjson');

/**
 * Load state from STATE.json
 */
export function loadState(): State {
  try {
    const data = readFileSync(STATE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    throw new Error(`Failed to load state: ${error}`);
  }
}

/**
 * Save state to STATE.json
 */
export function saveState(state: State): void {
  state.run_updated_at = new Date().toISOString();
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

/**
 * Append entry to LEDGER.ndjson
 */
export function appendLedger(entry: LedgerEntry): void {
  const line = JSON.stringify(entry) + '\n';
  appendFileSync(LEDGER_FILE, line, 'utf-8');
}

/**
 * Read all ledger entries
 */
export function readLedger(): LedgerEntry[] {
  try {
    const data = readFileSync(LEDGER_FILE, 'utf-8');
    return data
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line));
  } catch (error) {
    return [];
  }
}

/**
 * Update state statistics based on a ledger entry
 */
export function updateStats(state: State, entry: LedgerEntry): void {
  state.stats[entry.solved_status]++;
  state.total_processed++;
  state.last_issue_number = entry.issue_number;
}
