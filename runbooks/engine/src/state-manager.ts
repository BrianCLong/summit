/**
 * State Manager - Persistence layer for runbook executions
 *
 * Supports multiple backends:
 * - Memory (for testing)
 * - PostgreSQL (for production)
 */

import {
  RunbookExecution,
  RunbookLogEntry,
  Evidence,
  ExecutionStatus,
  LogQuery,
} from './types';

/**
 * Storage backend interface
 */
export interface StateStorage {
  /**
   * Save or update a runbook execution
   */
  saveExecution(execution: RunbookExecution): Promise<void>;

  /**
   * Get a runbook execution by ID
   */
  getExecution(executionId: string): Promise<RunbookExecution | null>;

  /**
   * Get all executions for a runbook
   */
  getExecutionsByRunbook(runbookId: string): Promise<RunbookExecution[]>;

  /**
   * Query logs
   */
  queryLogs(query: LogQuery): Promise<RunbookLogEntry[]>;

  /**
   * Get evidence by ID
   */
  getEvidence(evidenceId: string): Promise<Evidence | null>;

  /**
   * Get all evidence for an execution
   */
  getExecutionEvidence(executionId: string): Promise<Evidence[]>;

  /**
   * Delete an execution
   */
  deleteExecution(executionId: string): Promise<void>;

  /**
   * Check if an execution with the same runbook ID and input hash exists
   * (for idempotency)
   */
  findDuplicateExecution(
    runbookId: string,
    inputHash: string
  ): Promise<RunbookExecution | null>;
}

/**
 * In-memory storage (for testing)
 */
export class MemoryStorage implements StateStorage {
  private executions: Map<string, RunbookExecution> = new Map();
  private logs: Map<string, RunbookLogEntry[]> = new Map();
  private evidence: Map<string, Evidence> = new Map();
  private inputHashes: Map<string, string> = new Map(); // runbookId:inputHash -> executionId

  async saveExecution(execution: RunbookExecution): Promise<void> {
    // Deep clone to avoid reference issues
    const clone = this.deepClone(execution);
    this.executions.set(execution.id, clone);

    // Store logs
    this.logs.set(execution.id, clone.logs);

    // Store evidence
    for (const ev of clone.evidence) {
      this.evidence.set(ev.id, ev);
    }

    // Store input hash for idempotency
    const inputHash = this.hashInput(execution.input);
    const hashKey = `${execution.runbookId}:${inputHash}`;
    this.inputHashes.set(hashKey, execution.id);
  }

  async getExecution(executionId: string): Promise<RunbookExecution | null> {
    const execution = this.executions.get(executionId);
    return execution ? this.deepClone(execution) : null;
  }

  async getExecutionsByRunbook(runbookId: string): Promise<RunbookExecution[]> {
    const executions: RunbookExecution[] = [];
    for (const execution of this.executions.values()) {
      if (execution.runbookId === runbookId) {
        executions.push(this.deepClone(execution));
      }
    }
    return executions.sort(
      (a, b) => b.startTime.getTime() - a.startTime.getTime()
    );
  }

  async queryLogs(query: LogQuery): Promise<RunbookLogEntry[]> {
    const executionLogs = this.logs.get(query.executionId) || [];
    let filtered = executionLogs;

    if (query.stepId) {
      filtered = filtered.filter((log) => log.stepId === query.stepId);
    }

    if (query.level) {
      filtered = filtered.filter((log) => log.level === query.level);
    }

    if (query.startTime) {
      filtered = filtered.filter(
        (log) => log.timestamp >= query.startTime!
      );
    }

    if (query.endTime) {
      filtered = filtered.filter((log) => log.timestamp <= query.endTime!);
    }

    // Sort by timestamp
    filtered.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || filtered.length;

    return filtered.slice(offset, offset + limit);
  }

  async getEvidence(evidenceId: string): Promise<Evidence | null> {
    return this.evidence.get(evidenceId) || null;
  }

  async getExecutionEvidence(executionId: string): Promise<Evidence[]> {
    const execution = await this.getExecution(executionId);
    return execution?.evidence || [];
  }

  async deleteExecution(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (execution) {
      this.executions.delete(executionId);
      this.logs.delete(executionId);

      // Remove from input hashes
      const inputHash = this.hashInput(execution.input);
      const hashKey = `${execution.runbookId}:${inputHash}`;
      this.inputHashes.delete(hashKey);
    }
  }

  async findDuplicateExecution(
    runbookId: string,
    inputHash: string
  ): Promise<RunbookExecution | null> {
    const hashKey = `${runbookId}:${inputHash}`;
    const executionId = this.inputHashes.get(hashKey);
    if (executionId) {
      return this.getExecution(executionId);
    }
    return null;
  }

  /**
   * Deep clone utility
   */
  private deepClone<T>(obj: T): T {
    if (obj instanceof Map) {
      const clone = new Map();
      for (const [key, value] of obj) {
        clone.set(key, this.deepClone(value));
      }
      return clone as any;
    }
    if (obj instanceof Date) {
      return new Date(obj.getTime()) as any;
    }
    if (obj instanceof Set) {
      return new Set(Array.from(obj)) as any;
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => this.deepClone(item)) as any;
    }
    if (obj && typeof obj === 'object') {
      const clone: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clone[key] = this.deepClone((obj as any)[key]);
        }
      }
      return clone;
    }
    return obj;
  }

  /**
   * Hash input for idempotency checks
   */
  private hashInput(input: Record<string, any>): string {
    // Simple JSON stringify for now - in production, use proper hashing
    return JSON.stringify(this.sortObject(input));
  }

  private sortObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.sortObject(item));
    }
    if (obj && typeof obj === 'object' && !(obj instanceof Date)) {
      const sorted: any = {};
      const keys = Object.keys(obj).sort();
      for (const key of keys) {
        sorted[key] = this.sortObject(obj[key]);
      }
      return sorted;
    }
    return obj;
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.executions.clear();
    this.logs.clear();
    this.evidence.clear();
    this.inputHashes.clear();
  }
}

/**
 * State Manager - manages persistence of runbook state
 */
export class StateManager {
  private storage: StateStorage;

  constructor(storage: StateStorage) {
    this.storage = storage;
  }

  /**
   * Save execution state
   */
  async saveExecution(execution: RunbookExecution): Promise<void> {
    await this.storage.saveExecution(execution);
  }

  /**
   * Get execution by ID
   */
  async getExecution(executionId: string): Promise<RunbookExecution | null> {
    return this.storage.getExecution(executionId);
  }

  /**
   * Get all executions for a runbook
   */
  async getExecutionsByRunbook(runbookId: string): Promise<RunbookExecution[]> {
    return this.storage.getExecutionsByRunbook(runbookId);
  }

  /**
   * Query logs
   */
  async queryLogs(query: LogQuery): Promise<RunbookLogEntry[]> {
    return this.storage.queryLogs(query);
  }

  /**
   * Get evidence
   */
  async getEvidence(evidenceId: string): Promise<Evidence | null> {
    return this.storage.getEvidence(evidenceId);
  }

  /**
   * Get all evidence for an execution
   */
  async getExecutionEvidence(executionId: string): Promise<Evidence[]> {
    return this.storage.getExecutionEvidence(executionId);
  }

  /**
   * Check for duplicate execution (idempotency)
   */
  async findDuplicateExecution(
    runbookId: string,
    input: Record<string, any>
  ): Promise<RunbookExecution | null> {
    const inputHash = this.hashInput(input);
    return this.storage.findDuplicateExecution(runbookId, inputHash);
  }

  /**
   * Hash input consistently
   */
  private hashInput(input: Record<string, any>): string {
    // Use crypto hash in production
    const crypto = require('crypto');
    const sorted = this.sortObject(input);
    const json = JSON.stringify(sorted);
    return crypto.createHash('sha256').update(json).digest('hex');
  }

  private sortObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.sortObject(item));
    }
    if (obj && typeof obj === 'object' && !(obj instanceof Date)) {
      const sorted: any = {};
      const keys = Object.keys(obj).sort();
      for (const key of keys) {
        sorted[key] = this.sortObject(obj[key]);
      }
      return sorted;
    }
    return obj;
  }
}
