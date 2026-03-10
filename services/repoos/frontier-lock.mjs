#!/usr/bin/env node

/**
 * Frontier Lock Protocol
 *
 * Prevents patch race conditions by ensuring only one active frontier per concern.
 * Critical for stability in autonomous repositories with multiple AI agents.
 *
 * States:
 * - OPEN: Frontier accepting patches
 * - LOCKED: Frontier acquired for synthesis
 * - SYNTHESIZING: Delta generation in progress
 * - STABLE: Synthesis complete, ready for PR
 * - ARCHIVED: Frontier materialized to PR
 *
 * This eliminates the classic multi-agent patch race problem:
 * - agent-A → patch → auth.ts
 * - agent-B → patch → auth.ts
 * - agent-C → patch → auth.ts
 *
 * Without locks: 3 concurrent synthesis attempts → chaos
 * With locks: 1 synthesis attempt → stability
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Frontier states
 */
export const FrontierState = {
  OPEN: 'open',
  LOCKED: 'locked',
  SYNTHESIZING: 'synthesizing',
  STABLE: 'stable',
  ARCHIVED: 'archived'
};

/**
 * Lock timeout (10 minutes default)
 */
const DEFAULT_LOCK_TIMEOUT = 10 * 60 * 1000;

/**
 * Frontier Lock Manager
 */
export class FrontierLockManager {
  constructor(config = {}) {
    this.repoRoot = config.repoRoot || process.cwd();
    this.lockFile = config.lockFile || '.repoos/frontier-locks.json';
    this.lockTimeout = config.lockTimeout || DEFAULT_LOCK_TIMEOUT;
    this.locks = new Map();
    this.loaded = false;
  }

  /**
   * Initialize lock manager
   */
  async initialize() {
    await this.loadLocks();
    this.loaded = true;
  }

  /**
   * Acquire lock for a concern
   * @param {string} concern - Concern ID
   * @param {string} ownerId - Owner identifier (agent, user, etc.)
   * @returns {boolean} True if lock acquired
   */
  async acquireLock(concern, ownerId = 'system') {
    await this.ensureLoaded();

    // Check for existing lock
    const existing = this.locks.get(concern);

    if (existing) {
      // Check if lock is stale
      if (this.isLockStale(existing)) {
        console.log(`🔓 Stale lock detected for ${concern}, recovering...`);
        await this.releaseLock(concern);
      } else if (existing.ownerId === ownerId) {
        // Same owner can re-acquire
        console.log(`🔒 Lock refreshed for ${concern} by ${ownerId}`);
        existing.acquiredAt = Date.now();
        await this.saveLocks();
        return true;
      } else {
        // Lock held by someone else
        return false;
      }
    }

    // Acquire new lock
    const lock = {
      concern,
      ownerId,
      state: FrontierState.LOCKED,
      acquiredAt: Date.now(),
      timeout: this.lockTimeout
    };

    this.locks.set(concern, lock);
    await this.saveLocks();

    console.log(`🔒 Lock acquired for ${concern} by ${ownerId}`);
    return true;
  }

  /**
   * Release lock for a concern
   * @param {string} concern - Concern ID
   * @param {string} ownerId - Owner identifier (optional, for verification)
   * @returns {boolean} True if lock released
   */
  async releaseLock(concern, ownerId = null) {
    await this.ensureLoaded();

    const lock = this.locks.get(concern);

    if (!lock) {
      return false;
    }

    // Verify owner if specified
    if (ownerId && lock.ownerId !== ownerId) {
      console.log(`⚠️  Cannot release lock for ${concern}: owned by ${lock.ownerId}, not ${ownerId}`);
      return false;
    }

    this.locks.delete(concern);
    await this.saveLocks();

    console.log(`🔓 Lock released for ${concern}`);
    return true;
  }

  /**
   * Check if concern is locked
   * @param {string} concern - Concern ID
   * @returns {boolean} True if locked
   */
  async isLocked(concern) {
    await this.ensureLoaded();

    const lock = this.locks.get(concern);

    if (!lock) {
      return false;
    }

    // Check if stale
    if (this.isLockStale(lock)) {
      console.log(`🔓 Stale lock detected for ${concern}, releasing...`);
      await this.releaseLock(concern);
      return false;
    }

    return true;
  }

  /**
   * Update frontier state
   * @param {string} concern - Concern ID
   * @param {string} state - New state
   * @returns {boolean} True if updated
   */
  async updateState(concern, state) {
    await this.ensureLoaded();

    const lock = this.locks.get(concern);

    if (!lock) {
      return false;
    }

    lock.state = state;
    lock.updatedAt = Date.now();
    await this.saveLocks();

    console.log(`📊 Frontier ${concern} state: ${state}`);
    return true;
  }

  /**
   * Get lock info for a concern
   * @param {string} concern - Concern ID
   * @returns {Object|null} Lock info or null
   */
  async getLock(concern) {
    await this.ensureLoaded();
    return this.locks.get(concern) || null;
  }

  /**
   * Get all locks
   * @returns {Array} Array of lock objects
   */
  async getAllLocks() {
    await this.ensureLoaded();
    return Array.from(this.locks.values());
  }

  /**
   * Get locks by state
   * @param {string} state - Frontier state
   * @returns {Array} Array of locks in that state
   */
  async getLocksByState(state) {
    await this.ensureLoaded();
    return Array.from(this.locks.values()).filter(lock => lock.state === state);
  }

  /**
   * Check if lock is stale (exceeded timeout)
   * @param {Object} lock - Lock object
   * @returns {boolean} True if stale
   */
  isLockStale(lock) {
    const age = Date.now() - lock.acquiredAt;
    return age > lock.timeout;
  }

  /**
   * Clean up stale locks
   * @returns {number} Number of locks cleaned
   */
  async cleanupStaleLocks() {
    await this.ensureLoaded();

    const staleLocks = [];

    for (const [concern, lock] of this.locks.entries()) {
      if (this.isLockStale(lock)) {
        staleLocks.push(concern);
      }
    }

    for (const concern of staleLocks) {
      await this.releaseLock(concern);
    }

    if (staleLocks.length > 0) {
      console.log(`🧹 Cleaned up ${staleLocks.length} stale locks`);
    }

    return staleLocks.length;
  }

  /**
   * Load locks from disk
   */
  async loadLocks() {
    const lockPath = path.join(this.repoRoot, this.lockFile);

    try {
      const data = await fs.readFile(lockPath, 'utf8');
      const lockData = JSON.parse(data);

      this.locks = new Map(Object.entries(lockData.locks || {}));
      console.log(`📂 Loaded ${this.locks.size} frontier locks`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error(`⚠️  Failed to load locks: ${error.message}`);
      }
      this.locks = new Map();
    }
  }

  /**
   * Save locks to disk
   */
  async saveLocks() {
    const lockPath = path.join(this.repoRoot, this.lockFile);

    // Ensure directory exists
    await fs.mkdir(path.dirname(lockPath), { recursive: true });

    const lockData = {
      version: '1.0',
      updatedAt: new Date().toISOString(),
      locks: Object.fromEntries(this.locks)
    };

    await fs.writeFile(lockPath, JSON.stringify(lockData, null, 2));
  }

  /**
   * Ensure locks are loaded
   */
  async ensureLoaded() {
    if (!this.loaded) {
      await this.initialize();
    }
  }

  /**
   * Get lock statistics
   * @returns {Object} Lock statistics
   */
  async getStatistics() {
    await this.ensureLoaded();

    const stats = {
      total: this.locks.size,
      byState: {},
      stale: 0,
      avgDuration: 0
    };

    let totalDuration = 0;

    for (const lock of this.locks.values()) {
      // Count by state
      stats.byState[lock.state] = (stats.byState[lock.state] || 0) + 1;

      // Count stale
      if (this.isLockStale(lock)) {
        stats.stale++;
      }

      // Calculate duration
      const duration = Date.now() - lock.acquiredAt;
      totalDuration += duration;
    }

    if (this.locks.size > 0) {
      stats.avgDuration = Math.round(totalDuration / this.locks.size / 1000); // seconds
    }

    return stats;
  }

  /**
   * Format lock for display
   * @param {Object} lock - Lock object
   * @returns {string} Formatted string
   */
  formatLock(lock) {
    const age = Math.round((Date.now() - lock.acquiredAt) / 1000);
    const stale = this.isLockStale(lock) ? ' [STALE]' : '';

    return `${lock.concern}: ${lock.state} (${lock.ownerId}, ${age}s)${stale}`;
  }

  /**
   * Log all locks
   */
  async logLocks() {
    await this.ensureLoaded();

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                 Frontier Lock Status                         ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    if (this.locks.size === 0) {
      console.log('No active frontier locks.\n');
      return;
    }

    const stats = await this.getStatistics();

    console.log(`Total Locks: ${stats.total}`);
    console.log(`Stale Locks: ${stats.stale}`);
    console.log(`Avg Duration: ${stats.avgDuration}s\n`);

    console.log('By State:');
    for (const [state, count] of Object.entries(stats.byState)) {
      console.log(`  ${state}: ${count}`);
    }

    console.log('\nActive Locks:\n');

    for (const lock of this.locks.values()) {
      console.log(`  ${this.formatLock(lock)}`);
    }

    console.log('');
  }
}

/**
 * CLI usage
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const manager = new FrontierLockManager();
  await manager.initialize();

  const command = process.argv[2];

  switch (command) {
    case 'status':
      await manager.logLocks();
      break;

    case 'cleanup':
      const cleaned = await manager.cleanupStaleLocks();
      console.log(`✅ Cleaned up ${cleaned} stale locks`);
      break;

    case 'acquire':
      const concern = process.argv[3];
      const owner = process.argv[4] || 'cli';
      if (!concern) {
        console.log('Usage: node frontier-lock.mjs acquire <concern> [owner]');
        process.exit(1);
      }
      const acquired = await manager.acquireLock(concern, owner);
      console.log(acquired ? `✅ Lock acquired for ${concern}` : `❌ Failed to acquire lock for ${concern}`);
      break;

    case 'release':
      const concernRelease = process.argv[3];
      if (!concernRelease) {
        console.log('Usage: node frontier-lock.mjs release <concern>');
        process.exit(1);
      }
      const released = await manager.releaseLock(concernRelease);
      console.log(released ? `✅ Lock released for ${concernRelease}` : `❌ Failed to release lock for ${concernRelease}`);
      break;

    case 'stats':
      const stats = await manager.getStatistics();
      console.log('\nFrontier Lock Statistics:\n');
      console.log(`Total Locks: ${stats.total}`);
      console.log(`Stale Locks: ${stats.stale}`);
      console.log(`Average Duration: ${stats.avgDuration}s\n`);
      console.log('By State:');
      for (const [state, count] of Object.entries(stats.byState)) {
        console.log(`  ${state}: ${count}`);
      }
      break;

    default:
      console.log('Frontier Lock Protocol\n');
      console.log('Usage:');
      console.log('  node frontier-lock.mjs status          - Show all locks');
      console.log('  node frontier-lock.mjs stats           - Show statistics');
      console.log('  node frontier-lock.mjs cleanup         - Clean stale locks');
      console.log('  node frontier-lock.mjs acquire <concern> [owner] - Acquire lock');
      console.log('  node frontier-lock.mjs release <concern> - Release lock');
      console.log('\nFrontier States:');
      console.log(`  ${FrontierState.OPEN}         - Accepting patches`);
      console.log(`  ${FrontierState.LOCKED}       - Lock acquired`);
      console.log(`  ${FrontierState.SYNTHESIZING} - Generating delta`);
      console.log(`  ${FrontierState.STABLE}       - Ready for PR`);
      console.log(`  ${FrontierState.ARCHIVED}     - Materialized to PR`);
  }
}

export default FrontierLockManager;
