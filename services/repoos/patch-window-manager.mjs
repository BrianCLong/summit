#!/usr/bin/env node

/**
 * Concern-Scoped Patch Windows (CSPW)
 */

import fs from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';
import yaml from 'yaml';

const DEFAULT_WINDOW_MS = 60000;
const MIN_WINDOW_MS = 10000;
const MAX_WINDOW_MS = 300000;

export class PatchWindowManager extends EventEmitter {
  constructor(config = {}) {
    super();
    this.repoRoot = config.repoRoot || process.cwd();
    this.defaultWindowMs = config.defaultWindowMs || DEFAULT_WINDOW_MS;
    this.configFile = path.join(this.repoRoot, '.repoos/patch-windows.yml');
    this.windows = new Map();
    this.config = new Map();
    this.initialized = false;
    this.stats = { batchesEmitted: 0, totalPatches: 0 };
  }

  async initialize() {
    if (this.initialized) return;
    await this.loadConfig();
    this.initialized = true;
    this.emit('initialized');
  }

  async submitPatch(concern, patch) {
    await this.initialize();
    if (!this.windows.has(concern)) {
      this.startWindow(concern);
    }
    const window = this.windows.get(concern);
    window.patches.push({ ...patch, receivedAt: Date.now() });
    this.emit('patch-received', { concern, patch, patchCount: window.patches.length });
  }

  startWindow(concern) {
    const windowMs = this.getWindowDuration(concern);
    const window = {
      concern,
      patches: [],
      openedAt: Date.now(),
      windowMs,
      timer: setTimeout(() => this.closeWindow(concern), windowMs)
    };
    this.windows.set(concern, window);
    this.emit('window-opened', { concern, windowMs });
  }

  async closeWindow(concern) {
    const window = this.windows.get(concern);
    if (!window) return;
    if (window.timer) clearTimeout(window.timer);
    this.windows.delete(concern);
    const patches = window.patches;
    const duration = Date.now() - window.openedAt;
    if (patches.length === 0) {
      this.emit('window-closed-empty', { concern, duration });
      return;
    }
    this.stats.batchesEmitted++;
    this.stats.totalPatches += patches.length;
    this.emit('batch-ready', { concern, patches, count: patches.length, duration, windowMs: window.windowMs });
    this.emit('window-closed', { concern, patchCount: patches.length, duration });
  }

  async flush(concern) {
    await this.initialize();
    if (!this.windows.has(concern)) {
      console.warn(`No active window for ${concern}`);
      return;
    }
    await this.closeWindow(concern);
  }

  async flushAll() {
    await this.initialize();
    const concerns = Array.from(this.windows.keys());
    for (const concern of concerns) {
      await this.closeWindow(concern);
    }
  }

  getWindowDuration(concern) {
    return this.config.get(concern) || this.defaultWindowMs;
  }

  async setWindowDuration(concern, durationMs) {
    if (durationMs < MIN_WINDOW_MS || durationMs > MAX_WINDOW_MS) {
      throw new Error(`Window duration must be between ${MIN_WINDOW_MS}ms and ${MAX_WINDOW_MS}ms`);
    }
    this.config.set(concern, durationMs);
    await this.saveConfig();
    this.emit('config-updated', { concern, durationMs });
  }

  getActiveWindows() {
    const windows = [];
    for (const [concern, window] of this.windows.entries()) {
      const elapsed = Date.now() - window.openedAt;
      const remaining = window.windowMs - elapsed;
      windows.push({
        concern,
        patchCount: window.patches.length,
        openedAt: window.openedAt,
        windowMs: window.windowMs,
        elapsedMs: elapsed,
        remainingMs: Math.max(0, remaining)
      });
    }
    return windows;
  }

  getStatistics() {
    const windows = this.getActiveWindows();
    return {
      activeWindows: windows.length,
      patchesBuffered: windows.reduce((sum, w) => sum + w.patchCount, 0),
      batchesEmitted: this.stats.batchesEmitted,
      avgBatchSize: this.stats.batchesEmitted > 0 ? Math.round(this.stats.totalPatches / this.stats.batchesEmitted) : 0
    };
  }

  async loadConfig() {
    try {
      const content = await fs.readFile(this.configFile, 'utf-8');
      const data = yaml.parse(content);
      this.config.clear();
      for (const [concern, durationStr] of Object.entries(data || {})) {
        const durationMs = this.parseDuration(durationStr);
        if (durationMs) this.config.set(concern, durationMs);
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn(`Failed to load patch window config: ${error.message}`);
      }
    }
  }

  async saveConfig() {
    const data = {};
    for (const [concern, durationMs] of this.config.entries()) {
      data[concern] = this.formatDuration(durationMs);
    }
    await fs.mkdir(path.dirname(this.configFile), { recursive: true });
    await fs.writeFile(this.configFile, yaml.stringify(data));
  }

  parseDuration(str) {
    const match = str.match(/^(\d+)(ms|s|m)$/);
    if (!match) return null;
    const value = parseInt(match[1]);
    const unit = match[2];
    switch (unit) {
      case 'ms': return value;
      case 's': return value * 1000;
      case 'm': return value * 60000;
      default: return null;
    }
  }

  formatDuration(ms) {
    if (ms % 60000 === 0) return `${ms / 60000}m`;
    if (ms % 1000 === 0) return `${ms / 1000}s`;
    return `${ms}ms`;
  }

  async printStatus() {
    await this.initialize();
    const windows = this.getActiveWindows();
    const stats = this.getStatistics();
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║              Patch Window Manager Status                     ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    console.log(`Active Windows:    ${stats.activeWindows}`);
    console.log(`Patches Buffered:  ${stats.patchesBuffered}`);
    console.log(`Batches Emitted:   ${stats.batchesEmitted}`);
    console.log(`Avg Batch Size:    ${stats.avgBatchSize}\n`);
    if (windows.length > 0) {
      console.log('Active Windows:\n');
      console.log('Concern'.padEnd(30) + 'Patches'.padEnd(10) + 'Elapsed'.padEnd(12) + 'Remaining');
      console.log('─'.repeat(70));
      for (const window of windows) {
        const elapsedSec = Math.round(window.elapsedMs / 1000);
        const remainingSec = Math.round(window.remainingMs / 1000);
        console.log(window.concern.padEnd(30) + window.patchCount.toString().padEnd(10) + `${elapsedSec}s`.padEnd(12) + `${remainingSec}s`);
      }
    } else {
      console.log('No active windows.\n');
    }
    if (this.config.size > 0) {
      console.log('\nConfigured Windows:\n');
      console.log('Concern'.padEnd(30) + 'Duration');
      console.log('─'.repeat(50));
      for (const [concern, durationMs] of this.config.entries()) {
        console.log(concern.padEnd(30) + this.formatDuration(durationMs));
      }
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2] || 'status';
  const windowMgr = new PatchWindowManager();
  switch (command) {
    case 'status':
      await windowMgr.printStatus();
      break;
    case 'flush':
      const concern = process.argv[3];
      if (!concern) {
        console.error('Usage: node patch-window-manager.mjs flush <concern>');
        process.exit(1);
      }
      console.log(`Flushing window for ${concern}...`);
      await windowMgr.flush(concern);
      console.log('Window flushed.');
      break;
    case 'flush-all':
      console.log('Flushing all windows...');
      await windowMgr.flushAll();
      console.log('All windows flushed.');
      break;
    default:
      console.log('Usage:');
      console.log('  node patch-window-manager.mjs status           - Show window status');
      console.log('  node patch-window-manager.mjs flush <concern>  - Flush specific window');
      console.log('  node patch-window-manager.mjs flush-all        - Flush all windows');
      process.exit(1);
  }
}

export default PatchWindowManager;
