/**
 * Event Logger Module
 *
 * Provides structured JSONL event logging for session audit trails.
 * Features:
 * - Append-only JSONL format
 * - Deterministic output (timestamps optional)
 * - Monotonically increasing sequence numbers
 * - Automatic redaction of sensitive data
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Event types
 */
export type EventType =
  | 'run_start'
  | 'step_start'
  | 'action'
  | 'provider_call'
  | 'tool_exec'
  | 'policy_decision'
  | 'run_end'
  | 'error';

/**
 * Base event structure
 */
export interface BaseEvent {
  v: 1;
  ts: number | null;
  type: EventType;
  run_id: string;
  seq: number;
  data: Record<string, unknown>;
}

/**
 * Run start event data
 */
export interface RunStartData {
  command: string;
  args: string[];
  normalized_env: Record<string, string>;
  repo_root?: string;
  branch?: string;
  commit?: string;
  policy_enabled: boolean;
  sandbox_enabled: boolean;
}

/**
 * Step start event data
 */
export interface StepStartData {
  step_name: string;
  step_id: string;
}

/**
 * Action event data
 */
export interface ActionData {
  action_type: 'read' | 'write' | 'patch' | 'delete';
  affected_files: string[];
  diff_bytes?: number;
}

/**
 * Provider call event data
 */
export interface ProviderCallData {
  provider_name: string;
  request_id: string;
  retries: number;
  latency_ms: number | null;
  input_tokens?: number;
  output_tokens?: number;
  status: 'success' | 'error' | 'timeout';
}

/**
 * Tool execution event data
 */
export interface ToolExecData {
  tool: string;
  args: string[];
  exit_code: number;
  timeout: boolean;
  duration_ms: number | null;
}

/**
 * Run end event data
 */
export interface RunEndData {
  status: 'completed' | 'failed' | 'cancelled';
  duration_ms: number | null;
  diagnostics: {
    total_operations: number;
    files_read: number;
    files_written: number;
    tools_executed: number;
    provider_calls: number;
    retries: number;
    errors: number;
    denied: number;
  };
}

/**
 * Error event data
 */
export interface ErrorData {
  category: string;
  message: string;
  deny_reasons: string[];
}

/**
 * Policy decision event data
 */
export interface PolicyDecisionData {
  allow: boolean;
  deny_reasons: string[];
  limits: {
    max_files?: number;
    max_diff_bytes?: number;
    allow_network?: boolean;
    allow_tools?: string[];
  };
  policy_bundle_ref: string | null;
  policy_hash: string | null;
}

/**
 * Event logger options
 */
export interface EventLoggerOptions {
  sessionDir: string;
  runId: string;
  includeTimestamps?: boolean;
  unsafeLogPrompts?: boolean;
}

/**
 * Patterns for redacting sensitive data
 */
const REDACTION_PATTERNS = [
  // API keys and tokens
  /\b(sk-[a-zA-Z0-9]{20,})\b/g,
  /\b(xoxb-[a-zA-Z0-9-]+)\b/g,
  /\b(xoxp-[a-zA-Z0-9-]+)\b/g,
  /\b(ghp_[a-zA-Z0-9]{36,})\b/g,
  /\b(gho_[a-zA-Z0-9]{36,})\b/g,
  /\b(github_pat_[a-zA-Z0-9_]{22,})\b/g,
  // Bearer tokens
  /Bearer\s+[a-zA-Z0-9._-]+/gi,
  // JWT tokens
  /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
  // Generic secrets
  /\b(password|secret|token|apikey|api_key|auth)[=:]\s*["']?[^\s"']+["']?/gi,
  // AWS keys
  /\b(AKIA[0-9A-Z]{16})\b/g,
  /\b([a-zA-Z0-9/+]{40})\b/g,
];

/**
 * Redact sensitive data from a string
 */
export function redactSensitive(input: string): string {
  let result = input;
  for (const pattern of REDACTION_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]');
  }
  return result;
}

/**
 * Redact sensitive data from an object recursively
 */
export function redactObject(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return redactSensitive(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(redactObject);
  }
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Redact values for sensitive keys
      const sensitiveKeys = ['password', 'secret', 'token', 'key', 'auth', 'credential', 'bearer'];
      const isSensitiveKey = sensitiveKeys.some(k => key.toLowerCase().includes(k));
      if (isSensitiveKey && typeof value === 'string') {
        result[key] = '[REDACTED]';
      } else {
        result[key] = redactObject(value);
      }
    }
    return result;
  }
  return obj;
}

/**
 * Sort object keys deterministically
 */
export function sortObjectKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }
  if (obj !== null && typeof obj === 'object') {
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(obj as Record<string, unknown>).sort();
    for (const key of keys) {
      sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return obj;
}

/**
 * Stable sort for arrays of strings
 */
export function stableSortStrings(arr: string[]): string[] {
  return [...arr].sort((a, b) => a.localeCompare(b));
}

/**
 * Event logger class
 */
export class EventLogger {
  private options: EventLoggerOptions;
  private eventFile: string;
  private sequence: number = 0;
  private startTime: number;

  constructor(options: EventLoggerOptions) {
    this.options = options;
    this.startTime = Date.now();

    // Ensure session directory exists
    const sessionPath = path.join(options.sessionDir, options.runId);
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }

    this.eventFile = path.join(sessionPath, 'events.jsonl');
  }

  /**
   * Get the current timestamp (null if timestamps disabled)
   */
  private getTimestamp(): number | null {
    return this.options.includeTimestamps ? Date.now() : null;
  }

  /**
   * Get elapsed time in ms (null if timestamps disabled)
   */
  private getElapsedMs(): number | null {
    return this.options.includeTimestamps ? Date.now() - this.startTime : null;
  }

  /**
   * Write an event to the log
   */
  private writeEvent(type: EventType, data: Record<string, unknown>): void {
    this.sequence++;

    // Redact sensitive data unless unsafe mode
    const safeData = this.options.unsafeLogPrompts
      ? data
      : redactObject(data) as Record<string, unknown>;

    // Sort data keys for determinism
    const sortedData = sortObjectKeys(safeData) as Record<string, unknown>;

    const event: BaseEvent = {
      v: 1,
      ts: this.getTimestamp(),
      type,
      run_id: this.options.runId,
      seq: this.sequence,
      data: sortedData,
    };

    // Sort top-level keys
    const sortedEvent = sortObjectKeys(event);
    const line = JSON.stringify(sortedEvent) + '\n';

    fs.appendFileSync(this.eventFile, line);
  }

  /**
   * Log run start event
   */
  logRunStart(data: RunStartData): void {
    this.writeEvent('run_start', {
      ...data,
      args: stableSortStrings(data.args),
      normalized_env: sortObjectKeys(data.normalized_env),
    } as unknown as Record<string, unknown>);
  }

  /**
   * Log step start event
   */
  logStepStart(data: StepStartData): void {
    this.writeEvent('step_start', data as unknown as Record<string, unknown>);
  }

  /**
   * Log action event
   */
  logAction(data: ActionData): void {
    this.writeEvent('action', {
      ...data,
      affected_files: stableSortStrings(data.affected_files),
    } as unknown as Record<string, unknown>);
  }

  /**
   * Log provider call event
   */
  logProviderCall(data: Omit<ProviderCallData, 'latency_ms'> & { latency_ms?: number }): void {
    this.writeEvent('provider_call', {
      ...data,
      latency_ms: this.options.includeTimestamps ? data.latency_ms ?? null : null,
    } as unknown as Record<string, unknown>);
  }

  /**
   * Log tool execution event
   */
  logToolExec(data: Omit<ToolExecData, 'duration_ms'> & { duration_ms?: number }): void {
    this.writeEvent('tool_exec', {
      ...data,
      args: stableSortStrings(data.args),
      duration_ms: this.options.includeTimestamps ? data.duration_ms ?? null : null,
    } as unknown as Record<string, unknown>);
  }

  /**
   * Log run end event
   */
  logRunEnd(data: Omit<RunEndData, 'duration_ms'> & { duration_ms?: number }): void {
    this.writeEvent('run_end', {
      ...data,
      duration_ms: this.options.includeTimestamps ? data.duration_ms ?? this.getElapsedMs() : null,
      diagnostics: sortObjectKeys(data.diagnostics),
    } as unknown as Record<string, unknown>);
  }

  /**
   * Log error event
   */
  logError(data: ErrorData): void {
    this.writeEvent('error', {
      ...data,
      message: this.options.unsafeLogPrompts ? data.message : redactSensitive(data.message),
      deny_reasons: stableSortStrings(data.deny_reasons),
    } as unknown as Record<string, unknown>);
  }

  /**
   * Log policy decision event
   */
  logPolicyDecision(data: PolicyDecisionData): void {
    this.writeEvent('policy_decision', {
      ...data,
      deny_reasons: stableSortStrings(data.deny_reasons),
      limits: sortObjectKeys(data.limits),
    } as unknown as Record<string, unknown>);
  }

  /**
   * Get the event file path
   */
  getEventFile(): string {
    return this.eventFile;
  }

  /**
   * Get current sequence number
   */
  getSequence(): number {
    return this.sequence;
  }
}

/**
 * Read events from a JSONL file
 */
export function readEvents(eventFile: string): BaseEvent[] {
  if (!fs.existsSync(eventFile)) {
    return [];
  }

  const content = fs.readFileSync(eventFile, 'utf-8');
  const lines = content.trim().split('\n').filter(line => line.length > 0);

  return lines.map(line => JSON.parse(line) as BaseEvent);
}

/**
 * Create event logger
 */
export function createEventLogger(options: EventLoggerOptions): EventLogger {
  return new EventLogger(options);
}
