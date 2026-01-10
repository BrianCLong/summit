import fs from 'fs';
import path from 'path';

export type TraceEventType =
  | 'step-start'
  | 'input-collected'
  | 'validation'
  | 'tool-dispatch'
  | 'tool-result'
  | 'retry'
  | 'fallback'
  | 'stop-condition'
  | 'debug'
  | 'complete'
  | 'error';

export interface TraceEntry {
  timestamp: string;
  type: TraceEventType;
  message: string;
  data?: Record<string, unknown>;
}

const redactValue = (value: unknown, redactedKeys: string[]): unknown => {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, redactedKeys));
  }
  const clone: Record<string, unknown> = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, val]) => {
    if (redactedKeys.includes(key)) {
      clone[key] = '***redacted***';
    } else {
      clone[key] = redactValue(val, redactedKeys);
    }
  });
  return clone;
};

export class ActionTrace {
  private entries: TraceEntry[] = [];
  private readonly tracePath: string;

  constructor(private readonly runPath: string, private readonly redactedKeys: string[] = []) {
    this.tracePath = path.join(runPath, 'trace.ndjson');
  }

  log(type: TraceEventType, message: string, data?: Record<string, unknown>) {
    const entry: TraceEntry = {
      timestamp: new Date().toISOString(),
      type,
      message,
      data: data ? (redactValue(data, this.redactedKeys) as Record<string, unknown>) : undefined,
    };
    this.entries.push(entry);
    fs.mkdirSync(this.runPath, { recursive: true });
    fs.appendFileSync(this.tracePath, `${JSON.stringify(entry)}\n`);
  }

  toJSON(): TraceEntry[] {
    return [...this.entries];
  }
}
