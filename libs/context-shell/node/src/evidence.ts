import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { ContextShellResult, ContextShellToolName } from './types.js';
import { hashValue } from './utils.js';

export interface EvidenceEventBase {
  id: string;
  traceId: string;
  timestamp: string;
  type: 'tool_call_start' | 'tool_call_end';
  tool: ContextShellToolName;
  attributes: Record<string, unknown>;
}

export interface EvidenceLoggerOptions {
  dir: string;
  traceId: string;
  now: () => number;
}

export class EvidenceLogger {
  private dir: string;
  private traceId: string;
  private now: () => number;
  private filePath: string;

  constructor(options: EvidenceLoggerOptions) {
    this.dir = options.dir;
    this.traceId = options.traceId;
    this.now = options.now;
    this.filePath = path.join(this.dir, `context-shell-${this.traceId}.jsonl`);
    fs.mkdirSync(this.dir, { recursive: true });
  }

  logStart(tool: ContextShellToolName, attributes: Record<string, unknown>) {
    this.write({
      id: randomUUID(),
      traceId: this.traceId,
      timestamp: new Date(this.now()).toISOString(),
      type: 'tool_call_start',
      tool,
      attributes,
    });
  }

  logEnd(
    tool: ContextShellToolName,
    result: ContextShellResult,
    attributes: Record<string, unknown>
  ) {
    const outputHash = hashValue(
      `${result.stdout}|${result.stderr}|${result.exitCode}`
    );
    this.write({
      id: randomUUID(),
      traceId: this.traceId,
      timestamp: new Date(this.now()).toISOString(),
      type: 'tool_call_end',
      tool,
      attributes: {
        ...attributes,
        outputHash,
        stdoutHash: hashValue(result.stdout),
        stderrHash: hashValue(result.stderr),
        exitCode: result.exitCode,
        durationMs: result.durationMs,
        filesRead: result.filesRead,
        filesWritten: result.filesWritten,
        redactionsApplied: result.redactionsApplied,
      },
    });
  }

  private write(event: EvidenceEventBase) {
    fs.appendFileSync(this.filePath, `${JSON.stringify(event)}\n`, 'utf8');
  }
}
