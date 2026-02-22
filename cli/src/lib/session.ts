/**
 * Session Management Module
 *
 * Provides session tracking for CLI operations:
 * - Deterministic session ID generation
 * - Session state persistence
 * - Operation audit trail
 * - Diagnostics collection
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Session state
 */
export interface SessionState {
  sessionId: string;
  startTime: string;
  endTime?: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  repoRoot: string;
  command: string;
  flags: Record<string, unknown>;
  operations: OperationRecord[];
  diagnostics: SessionDiagnostics;
}

/**
 * Operation record for audit trail
 */
export interface OperationRecord {
  timestamp: string;
  type: 'read' | 'write' | 'exec' | 'network' | 'git' | 'policy';
  target: string;
  status: 'allowed' | 'denied' | 'success' | 'failure';
  details: Record<string, unknown>;
  durationMs: number;
}

/**
 * Session diagnostics
 */
export interface SessionDiagnostics {
  totalOperations: number;
  allowedOperations: number;
  deniedOperations: number;
  successfulOperations: number;
  failedOperations: number;
  totalDurationMs: number;
  peakMemoryMb: number;
  filesRead: number;
  filesWritten: number;
  toolsExecuted: number;
  networkCalls: number;
  policyEvaluations: number;
  gitOperations: number;
}

/**
 * Session options
 */
export interface SessionOptions {
  repoRoot: string;
  command: string;
  flags: Record<string, unknown>;
  sessionDir?: string;
  deterministicId?: boolean;
  seed?: string;
}

/**
 * Generate deterministic session ID
 */
export function generateSessionId(
  repoRoot: string,
  command: string,
  timestamp: string,
  seed?: string
): string {
  const input = [repoRoot, command, timestamp, seed || ''].join('|');
  const hash = crypto.createHash('sha256').update(input).digest('hex');
  return `session-${hash.slice(0, 16)}`;
}

/**
 * Generate random session ID
 */
export function generateRandomSessionId(): string {
  const randomBytes = crypto.randomBytes(8).toString('hex');
  return `session-${randomBytes}`;
}

/**
 * Session class for tracking CLI operations
 */
export class Session {
  private state: SessionState;
  private sessionDir: string;
  private sessionFile: string;
  private startMemory: number;

  constructor(options: SessionOptions) {
    const startTime = new Date().toISOString();
    const sessionId = options.deterministicId
      ? generateSessionId(options.repoRoot, options.command, startTime, options.seed)
      : generateRandomSessionId();

    this.sessionDir = options.sessionDir || path.join(options.repoRoot, '.claude', 'sessions');
    this.sessionFile = path.join(this.sessionDir, `${sessionId}.json`);
    this.startMemory = process.memoryUsage().heapUsed;

    this.state = {
      sessionId,
      startTime,
      status: 'running',
      repoRoot: options.repoRoot,
      command: options.command,
      flags: this.sanitizeFlags(options.flags),
      operations: [],
      diagnostics: {
        totalOperations: 0,
        allowedOperations: 0,
        deniedOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        totalDurationMs: 0,
        peakMemoryMb: 0,
        filesRead: 0,
        filesWritten: 0,
        toolsExecuted: 0,
        networkCalls: 0,
        policyEvaluations: 0,
        gitOperations: 0,
      },
    };

    // Ensure session directory exists
    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
    }
  }

  /**
   * Sanitize flags to remove sensitive values
   */
  private sanitizeFlags(flags: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    const sensitivePatterns = [/password/i, /secret/i, /token/i, /key/i, /credential/i];

    for (const [key, value] of Object.entries(flags)) {
      const isSensitive = sensitivePatterns.some((pattern) => pattern.test(key));
      sanitized[key] = isSensitive ? '[REDACTED]' : value;
    }

    return sanitized;
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.state.sessionId;
  }

  /**
   * Get current state
   */
  getState(): SessionState {
    return { ...this.state };
  }

  /**
   * Record an operation
   */
  recordOperation(
    type: OperationRecord['type'],
    target: string,
    status: OperationRecord['status'],
    details: Record<string, unknown> = {},
    durationMs: number = 0
  ): void {
    const operation: OperationRecord = {
      timestamp: new Date().toISOString(),
      type,
      target,
      status,
      details: this.sanitizeDetails(details),
      durationMs,
    };

    this.state.operations.push(operation);
    this.updateDiagnostics(operation);
    this.persist();
  }

  /**
   * Sanitize operation details
   */
  private sanitizeDetails(details: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(details)) {
      if (typeof value === 'string' && value.length > 1000) {
        sanitized[key] = `[TRUNCATED: ${value.length} chars]`;
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Update diagnostics based on operation
   */
  private updateDiagnostics(operation: OperationRecord): void {
    const d = this.state.diagnostics;

    d.totalOperations++;
    d.totalDurationMs += operation.durationMs;

    if (operation.status === 'allowed' || operation.status === 'success') {
      d.allowedOperations++;
    }
    if (operation.status === 'denied') {
      d.deniedOperations++;
    }
    if (operation.status === 'success') {
      d.successfulOperations++;
    }
    if (operation.status === 'failure') {
      d.failedOperations++;
    }

    switch (operation.type) {
      case 'read':
        d.filesRead++;
        break;
      case 'write':
        d.filesWritten++;
        break;
      case 'exec':
        d.toolsExecuted++;
        break;
      case 'network':
        d.networkCalls++;
        break;
      case 'policy':
        d.policyEvaluations++;
        break;
      case 'git':
        d.gitOperations++;
        break;
    }

    // Update peak memory
    const currentMemoryMb = (process.memoryUsage().heapUsed - this.startMemory) / 1024 / 1024;
    if (currentMemoryMb > d.peakMemoryMb) {
      d.peakMemoryMb = Math.round(currentMemoryMb * 100) / 100;
    }
  }

  /**
   * Mark session as completed
   */
  complete(): void {
    this.state.status = 'completed';
    this.state.endTime = new Date().toISOString();
    this.persist();
  }

  /**
   * Mark session as failed
   */
  fail(error?: string): void {
    this.state.status = 'failed';
    this.state.endTime = new Date().toISOString();
    if (error) {
      this.recordOperation('policy', 'session', 'failure', { error });
    }
    this.persist();
  }

  /**
   * Mark session as cancelled
   */
  cancel(): void {
    this.state.status = 'cancelled';
    this.state.endTime = new Date().toISOString();
    this.persist();
  }

  /**
   * Persist session state to file
   */
  private persist(): void {
    try {
      const json = JSON.stringify(this.state, Object.keys(this.state).sort(), 2);
      fs.writeFileSync(this.sessionFile, json);
    } catch {
      // Ignore persistence errors
    }
  }

  /**
   * Get session file path
   */
  getSessionFile(): string {
    return this.sessionFile;
  }

  /**
   * Format session as JSON (deterministic output)
   */
  toJSON(): string {
    return JSON.stringify(this.state, Object.keys(this.state).sort(), 2);
  }

  /**
   * Format session summary for display
   */
  formatSummary(): string {
    const d = this.state.diagnostics;
    const duration = this.state.endTime
      ? new Date(this.state.endTime).getTime() - new Date(this.state.startTime).getTime()
      : Date.now() - new Date(this.state.startTime).getTime();

    const lines = [
      `Session: ${this.state.sessionId}`,
      `Status: ${this.state.status}`,
      `Duration: ${Math.round(duration / 1000)}s`,
      `Operations: ${d.totalOperations} (${d.successfulOperations} success, ${d.failedOperations} failed, ${d.deniedOperations} denied)`,
      `Files: ${d.filesRead} read, ${d.filesWritten} written`,
      `Tools: ${d.toolsExecuted} executed`,
      `Network: ${d.networkCalls} calls`,
      `Git: ${d.gitOperations} operations`,
      `Policy: ${d.policyEvaluations} evaluations`,
      `Peak Memory: ${d.peakMemoryMb}MB`,
    ];

    return lines.join('\n');
  }
}

/**
 * Load session from file
 */
export function loadSession(sessionFile: string): SessionState | null {
  try {
    if (!fs.existsSync(sessionFile)) {
      return null;
    }
    const content = fs.readFileSync(sessionFile, 'utf-8');
    return JSON.parse(content) as SessionState;
  } catch {
    return null;
  }
}

/**
 * List sessions in a directory
 */
export function listSessions(sessionDir: string): SessionState[] {
  try {
    if (!fs.existsSync(sessionDir)) {
      return [];
    }

    const files = fs.readdirSync(sessionDir).filter((f) => f.endsWith('.json'));
    const sessionsWithMtime: Array<{ session: SessionState; mtime: number }> = [];

    for (const file of files) {
      const filePath = path.join(sessionDir, file);
      const session = loadSession(filePath);
      if (session) {
        // Use file mtime as secondary sort key for determinism
        const stat = fs.statSync(filePath);
        sessionsWithMtime.push({ session, mtime: stat.mtimeMs });
      }
    }

    // Sort by start time (newest first), then by file mtime (newest first) as tiebreaker
    return sessionsWithMtime
      .sort((a, b) => {
        const timeDiff = new Date(b.session.startTime).getTime() - new Date(a.session.startTime).getTime();
        if (timeDiff !== 0) return timeDiff;
        // Use file mtime as tiebreaker (newer files first)
        const mtimeDiff = b.mtime - a.mtime;
        if (mtimeDiff !== 0) return mtimeDiff;
        // Final tiebreaker: sessionId (deterministic)
        return b.session.sessionId.localeCompare(a.session.sessionId);
      })
      .map((item) => item.session);
  } catch {
    return [];
  }
}

/**
 * Clean old sessions
 */
export function cleanOldSessions(sessionDir: string, maxAgeDays: number = 7): number {
  try {
    if (!fs.existsSync(sessionDir)) {
      return 0;
    }

    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
    const files = fs.readdirSync(sessionDir).filter((f) => f.endsWith('.json'));
    let cleaned = 0;

    for (const file of files) {
      const filePath = path.join(sessionDir, file);
      const session = loadSession(filePath);

      if (session && new Date(session.startTime).getTime() <= cutoff) {
        fs.unlinkSync(filePath);
        cleaned++;
      }
    }

    return cleaned;
  } catch {
    return 0;
  }
}

/**
 * Create a new session
 */
export function createSession(options: SessionOptions): Session {
  return new Session(options);
}
