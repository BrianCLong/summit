/**
 * Switchboard Telemetry Emitter
 *
 * Local-only event stream for observability.
 * Saves to .switchboard/events/events.jsonl
 */

import * as fs from 'fs';
import * as path from 'path';

export type TelemetryEventType =
  | 'preflight_decision'
  | 'tool_execution_start'
  | 'tool_execution_end'
  | 'mcp_server_health';

export interface TelemetryEvent<T = Record<string, unknown>> {
  v: string;
  ts: string;
  type: TelemetryEventType;
  run_id: string;
  job_id?: string;
  action_id?: string;
  data: T;
}

export class TelemetryEmitter {
  private eventsDir: string;
  private eventFile: string;
  private runId: string;

  constructor(repoRoot: string, runId: string) {
    this.eventsDir = path.join(repoRoot, '.switchboard', 'events');
    this.eventFile = path.join(this.eventsDir, 'events.jsonl');
    this.runId = runId;

    if (!fs.existsSync(this.eventsDir)) {
      fs.mkdirSync(this.eventsDir, { recursive: true });
    }
  }

  emit<T = Record<string, unknown>>(
    type: TelemetryEventType,
    data: T,
    ids?: { job_id?: string; action_id?: string }
  ): void {
    const event: TelemetryEvent<T> = {
      v: '1',
      ts: new Date().toISOString(),
      type,
      run_id: this.runId,
      job_id: ids?.job_id,
      action_id: ids?.action_id,
      data,
    };

    fs.appendFileSync(this.eventFile, `${JSON.stringify(event)}\n`, 'utf8');
  }

  // Helper methods for specific events as requested

  emitPreflightDecision(data: {
    rule: string;
    allow: boolean;
    reason: string;
  }, ids?: { job_id?: string; action_id?: string }): void {
    this.emit('preflight_decision', data, ids);
  }

  emitToolExecutionStart(data: {
    tool: string;
    args: string[];
  }, ids?: { job_id?: string; action_id?: string }): void {
    this.emit('tool_execution_start', data, ids);
  }

  emitToolExecutionEnd(data: {
    tool: string;
    exit_code: number;
    duration_ms: number;
  }, ids?: { job_id?: string; action_id?: string }): void {
    this.emit('tool_execution_end', data, ids);
  }

  emitMcpServerHealth(data: {
    server_name: string;
    status: 'healthy' | 'unhealthy' | 'backoff';
    message?: string;
  }): void {
    this.emit('mcp_server_health', data);
  }
}

/**
 * Read events from a JSONL file
 */
export function readEvents(eventFile: string): TelemetryEvent[] {
  if (!fs.existsSync(eventFile)) {
    return [];
  }

  try {
    const content = fs.readFileSync(eventFile, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.length > 0);
    return lines.map(line => JSON.parse(line) as TelemetryEvent);
  } catch (e) {
    return [];
  }
}
