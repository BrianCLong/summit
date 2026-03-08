#!/usr/bin/env node

/**
 * Frontier Lock Protocol
 *
 * Prevents multi-agent patch races by ensuring single active frontier per concern.
 *
 * States:
 * - OPEN: Frontier available for lock acquisition
 * - LOCKED: Frontier locked, collecting patches
 * - SYNTHESIZING: Frontier synthesizing delta
 * - STABLE: Frontier synthesis complete
 * - ARCHIVED: Frontier archived, ready for new cycle
 *
 * Usage:
 *   import { FrontierLockManager } from './frontier-lock.mjs';
 *   const lockManager = new FrontierLockManager();
 *
 *   if (await lockManager.acquire('auth-system', 'agent-123')) {
 *     // perform synthesis
 *     await lockManager.transition('auth-system', 'SYNTHESIZING');
 *     // ... synthesis logic ...
 *     await lockManager.release('auth-system');
 *   }
 *
 * CLI:
 *   node frontier-lock.mjs status
 *   node frontier-lock.mjs cleanup
 */

import fs from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';

const LOCK_STATES = {
  OPEN: 'OPEN',
  LOCKED: 'LOCKED',
  SYNTHESIZING: 'SYNTHESIZING',
  STABLE: 'STABLE',
  ARCHIVED: 'ARCHIVED'
};

const DEFAULT_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const STALE_THRESHOLD = 60 * 60 * 1000; // 1 hour

/**
 * Frontier Lock Manager
 *
 * Manages atomic locks for frontier convergence to prevent patch races.
 */
export class FrontierLockManager extends EventEmitter {

  constructor(config = {}) {
    super();

    this.repoRoot = config.repoRoot || process.cwd();
    this.lockFile = path.join(this.repoRoot, '.repoos/frontier-locks.json');
    this.lockTimeout = config.lockTimeout || DEFAULT_TIMEOUT;
    this.staleThreshold = config.staleThreshold || STALE_THRESHOLD;

    this.locks = new Map();
    this.initialized = false;
  }

  /**
   * Initialize lock manager
   */
  async initialize() {
    if (this.initialized) return;

    // Ensure directory exists
    await fs.mkdir(path.dirname(this.lockFile), { recursive: true });

    // Load existing locks
    await this.load();

    // Clean up stale locks on init
    await this.cleanupStaleLocks();

    this.initialized = true;
    this.emit('initialized');
  }

  /**
   * Acquire lock for a concern
   *
   * @param {string} concern - Concern identifier
   * @param {string} holder - Lock holder identifier (agent, user, etc.)
   * @returns {boolean} true if lock acquired, false if already locked
   */
  async acquire(concern, holder) {
    await this.initialize();

    const existing = this.locks.get(concern);

    // Check if already locked
    if (existing && existing.state !== LOCK_STATES.ARCHIVED) {
      // Check for timeout
      const age = Date.now() - existing.acquiredAt;
      if (age < this.lockTimeout) {
        this.emit('acquire-failed', { concern, holder, reason: 'already-locked', existing });
        return false;
      }

      // Lock timed out, release it
      console.warn(`Lock for ${concern} timed out, releasing...`);
      await this.release(concern, 'timeout');
    }

    // Acquire lock
    const lock = {
      concern,
      holder,
      state: LOCK_STATES.LOCKED,
      acquiredAt: Date.now(),
      transitions: [{
        state: LOCK_STATES.LOCKED,
        timestamp: Date.now()
      }]
    };

    this.locks.set(concern, lock);
    await this.persist();

    this.emit('acquired', { concern, holder, lock });
    return true;
  }

  /**
   * Release lock for a concern
   *
   * @param {string} concern - Concern identifier
   * @param {string} reason - Release reason (optional)
   */
  async release(concern, reason = 'completed') {
    await this.initialize();

    const lock = this.locks.get(concern);
    if (!lock) {
      console.warn(`No lock found for ${concern}`);
      return;
    }

    // Archive the lock
    lock.state = LOCK_STATES.ARCHIVED;
    lock.releasedAt = Date.now();
    lock.releaseReason = reason;
    lock.transitions.push({
      state: LOCK_STATES.ARCHIVED,
      timestamp: Date.now(),
      reason
    });

    this.locks.set(concern, lock);
    await this.persist();

    this.emit('released', { concern, reason, lock });

    // Clean up archived lock after persistence
    setTimeout(() => {
      this.locks.delete(concern);
    }, 1000);
  }

  /**
   * Transition lock to new state
   *
   * @param {string} concern - Concern identifier
   * @param {string} newState - New state (SYNTHESIZING, STABLE, etc.)
   */
  async transition(concern, newState) {
    await this.initialize();

    const lock = this.locks.get(concern);
    if (!lock) {
      throw new Error(`No lock found for ${concern}`);
    }

    if (!Object.values(LOCK_STATES).includes(newState)) {
      throw new Error(`Invalid state: ${newState}`);
    }

    const oldState = lock.state;
    lock.state = newState;
    lock.transitions.push({
      state: newState,
      timestamp: Date.now()
    });

    this.locks.set(concern, lock);
    await this.persist();

    this.emit('transitioned', { concern, oldState, newState, lock });
  }

  /**
   * Check if concern is locked
   *
   * @param {string} concern - Concern identifier
   * @returns {boolean}
   */
  isLocked(concern) {
    const lock = this.locks.get(concern);
    if (!lock) return false;
    if (lock.state === LOCK_STATES.ARCHIVED) return false;

    // Check timeout
    const age = Date.now() - lock.acquiredAt;
    if (age >= this.lockTimeout) return false;

    return true;
  }

  /**
   * Get lock details
   *
   * @param {string} concern - Concern identifier
   * @returns {object|null}
   */
  getLock(concern) {
    return this.locks.get(concern) || null;
  }

  /**
   * Get all active locks
   *
   * @returns {Array}
   */
  getActiveLocks() {
    const active = [];
    for (const [concern, lock] of this.locks.entries()) {
      if (lock.state !== LOCK_STATES.ARCHIVED) {
        const age = Date.now() - lock.acquiredAt;
        if (age < this.lockTimeout) {
          active.push({
            ...lock,
            age,
            isStale: age > this.staleThreshold
          });
        }
      }
    }
    return active;
  }

  /**
   * Cleanup stale locks
   */
  async cleanupStaleLocks() {
    await this.initialize();

    let cleaned = 0;
    for (const [concern, lock] of this.locks.entries()) {
      if (lock.state === LOCK_STATES.ARCHIVED) continue;

      const age = Date.now() - lock.acquiredAt;
      if (age >= this.lockTimeout) {
        console.log(`Cleaning stale lock for ${concern} (age: ${Math.round(age / 1000 / 60)}m)`);
        await this.release(concern, 'stale-cleanup');
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`Cleaned ${cleaned} stale lock(s)`);
      this.emit('cleanup', { cleaned });
    }

    return cleaned;
  }

  /**
   * Get lock statistics
   */
  getStatistics() {
    const active = this.getActiveLocks();

    const stats = {
      total: active.length,
      byState: {},
      stale: 0,
      avgDuration: 0
    };

    let totalDuration = 0;
    for (const lock of active) {
      stats.byState[lock.state] = (stats.byState[lock.state] || 0) + 1;
      if (lock.isStale) stats.stale++;
      totalDuration += lock.age;
    }

    if (active.length > 0) {
      stats.avgDuration = Math.round(totalDuration / active.length / 1000); // seconds
    }

    return stats;
  }

  /**
   * Persist locks to filesystem
   */
  async persist() {
    const data = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      locks: Array.from(this.locks.entries()).map(([concern, lock]) => ({
        concern,
        ...lock
      }))
    };

    await fs.writeFile(this.lockFile, JSON.stringify(data, null, 2));
  }

  /**
   * Load locks from filesystem
   */
  async load() {
    try {
      const data = await fs.readFile(this.lockFile, 'utf-8');
      const parsed = JSON.parse(data);

      this.locks.clear();
      for (const lock of parsed.locks || []) {
        const { concern, ...lockData } = lock;
        this.locks.set(concern, lockData);
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn(`Failed to load locks: ${error.message}`);
      }
      // File doesn't exist yet, start fresh
    }
  }

  /**
   * Print lock status
   */
  async printStatus() {
    await this.initialize();

    const active = this.getActiveLocks();
    const stats = this.getStatistics();

    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                Frontier Lock Status                          ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    console.log(`Active Locks: ${stats.total}`);
    console.log(`Stale Locks:  ${stats.stale}`);
    console.log(`Avg Duration: ${stats.avgDuration}s\n`);

    if (stats.total > 0) {
      console.log('By State:');
      for (const [state, count] of Object.entries(stats.byState)) {
        console.log(`  ${state}: ${count}`);
      }
      console.log('');
    }

    if (active.length > 0) {
      console.log('Active Locks:\n');
      console.log('Concern'.padEnd(30) + 'State'.padEnd(15) + 'Holder'.padEnd(20) + 'Duration');
      console.log('─'.repeat(80));

      for (const lock of active) {
        const durationMin = Math.round(lock.age / 1000 / 60);
        const staleMarker = lock.isStale ? ' ⚠️' : '';
        console.log(
          lock.concern.padEnd(30) +
          lock.state.padEnd(15) +
          (lock.holder || 'unknown').substring(0, 19).padEnd(20) +
          `${durationMin}m${staleMarker}`
        );
      }
    } else {
      console.log('No active locks.\n');
    }
  }
}

/**
 * CLI usage
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2] || 'status';
  const lockManager = new FrontierLockManager();

  switch (command) {
    case 'status':
      await lockManager.printStatus();
      break;

    case 'cleanup':
      console.log('Running stale lock cleanup...\n');
      const cleaned = await lockManager.cleanupStaleLocks();
      if (cleaned === 0) {
        console.log('No stale locks found.');
      }
      break;

    default:
      console.log('Usage:');
      console.log('  node frontier-lock.mjs status   - Show lock status');
      console.log('  node frontier-lock.mjs cleanup  - Cleanup stale locks');
      process.exit(1);
  }
}

export default FrontierLockManager;
