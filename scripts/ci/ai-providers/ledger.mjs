/**
 * AI Request Ledger for Audit Trail
 * Records AI interactions without leaking sensitive content
 */

import { promises as fs } from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';

class AILedger {
  constructor(artifactDir) {
    this.artifactDir = artifactDir;
    this.entries = [];
  }

  /**
   * Add an AI interaction entry to the ledger
   */
  addEntry({
    cacheKey,
    model,
    promptVersion,
    schemaVersion,
    redactionFindings,
    cacheHit,
    elapsedMs,
    inputHash = null
  }) {
    const entry = {
      timestamp: new Date().toISOString(), // This is allowed in ledger - not in deterministic report.json
      cache_key: cacheKey,
      model,
      prompt_version: promptVersion,
      schema_version: schemaVersion,
      redaction_findings: redactionFindings, // Counts only, no raw content
      cache_result: cacheHit ? 'hit' : 'miss',
      elapsed_ms: elapsedMs,
      input_hash: inputHash
    };

    this.entries.push(entry);
  }

  /**
   * Write the ledger to disk
   */
  async write() {
    if (!this.entries.length) return;
    
    await fs.mkdir(this.artifactDir, { recursive: true });
    const ledgerPath = join(this.artifactDir, 'ai_ledger.json');
    
    // Sort entries for deterministic output
    const sortedEntries = [...this.entries].sort((a, b) => 
      a.cache_key.localeCompare(b.cache_key)
    );
    
    const ledger = {
      version: '1.0.0',
      generator: 'ai-request-auditor',
      created_at: new Date().toISOString(),
      entry_count: sortedEntries.length,
      entries: sortedEntries
    };
    
    await fs.writeFile(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');
  }

  /**
   * Clear all entries
   */
  clear() {
    this.entries = [];
  }
}

export default AILedger;