import { promises as fs } from 'node:fs';
import path from 'node:path';
import { TraceEvent, PlanIRSchema } from './types.js';
import { stableStringify, stableStringifyLine } from './bundle.js';
import { ActionContractRegistry } from './contracts.js';

export interface ReplayOptions {
  bundlePath: string;
  strict?: boolean;
  contractRegistry?: ActionContractRegistry;
}

export interface ReplayReport {
  ok: boolean;
  mismatches: string[];
  diff?: string;
}

export async function replayEvidenceBundle(options: ReplayOptions): Promise<ReplayReport> {
  const bundlePath = options.bundlePath;
  const planPath = path.join(bundlePath, 'plan.json');
  const tracePath = path.join(bundlePath, 'trace.ndjson');
  const manifestPath = path.join(bundlePath, 'manifest.json');

  const [planRaw, traceRaw, manifestRaw] = await Promise.all([
    fs.readFile(planPath, 'utf8'),
    fs.readFile(tracePath, 'utf8'),
    fs.readFile(manifestPath, 'utf8'),
  ]);

  const plan = PlanIRSchema.parse(JSON.parse(planRaw));
  const manifest = JSON.parse(manifestRaw) as { files?: Array<{ path: string }> };
  if (!manifest.files || manifest.files.length === 0) {
    return {
      ok: false,
      mismatches: ['manifest missing file entries'],
      diff: 'manifest.files empty',
    };
  }
  const manifestPaths = new Set(manifest.files.map((file) => file.path));
  const requiredPaths = ['plan.json', 'trace.ndjson'];
  for (const required of requiredPaths) {
    if (!manifestPaths.has(required)) {
      return {
        ok: false,
        mismatches: [`manifest missing ${required}`],
        diff: `manifest.files missing ${required}`,
      };
    }
  }

  const traceEvents = parseTrace(traceRaw);
  const replayEvents = traceEvents.map((event) => normalizeEvent(event));

  const mismatches: string[] = [];

  const normalizedOriginal = traceEvents.map((event) => normalizeEvent(event));
  if (normalizedOriginal.length !== replayEvents.length) {
    mismatches.push('event count mismatch');
  }

  const sequenceMismatch = compareSequence(normalizedOriginal, replayEvents);
  if (sequenceMismatch) {
    mismatches.push(sequenceMismatch);
  }

  for (const event of traceEvents) {
    if (event.run_id !== plan.run_id) {
      mismatches.push(`event run_id mismatch: ${event.run_id}`);
      break;
    }
    if (event.plan_id && event.plan_id !== plan.plan_id) {
      mismatches.push(`event plan_id mismatch: ${event.plan_id}`);
      break;
    }
  }

  if (options.contractRegistry) {
    for (const event of traceEvents) {
      if (event.type === 'tool:completed' || event.type === 'tool:validation_failed') {
        const toolName = event.tool_name ?? '';
        const contract = options.contractRegistry.get(toolName);
        if (!contract) {
          mismatches.push(`missing contract for tool ${toolName}`);
          continue;
        }
      }
    }
  }

  if (mismatches.length > 0 && options.strict) {
    return {
      ok: false,
      mismatches,
      diff: buildDiff(normalizedOriginal, replayEvents),
    };
  }

  const replayTracePath = path.join(bundlePath, 'trace.replay.ndjson');
  const replayContent = replayEvents.map((event) => `${stableStringifyLine(event)}\n`).join('');
  await fs.writeFile(replayTracePath, replayContent, 'utf8');

  return {
    ok: mismatches.length === 0,
    mismatches,
    diff: mismatches.length > 0 ? buildDiff(normalizedOriginal, replayEvents) : undefined,
  };
}

function parseTrace(raw: string): TraceEvent[] {
  const lines = raw.split('\n').filter(Boolean);
  return lines.map((line) => {
    const parsed = JSON.parse(line) as TraceEvent;
    if (!isTraceEvent(parsed)) {
      throw new Error('Invalid trace event schema');
    }
    return parsed;
  });
}

function isTraceEvent(value: TraceEvent): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return (
    typeof value.type === 'string' &&
    typeof value.timestamp === 'string' &&
    typeof value.run_id === 'string'
  );
}

function normalizeEvent(event: TraceEvent): TraceEvent {
  return {
    ...event,
    timestamp: 'normalized',
  };
}

function compareSequence(original: TraceEvent[], replay: TraceEvent[]): string | undefined {
  const len = Math.min(original.length, replay.length);
  for (let i = 0; i < len; i += 1) {
    const o = original[i];
    const r = replay[i];
    if (o.type !== r.type || o.step_id !== r.step_id || o.tool_name !== r.tool_name) {
      return `event mismatch at index ${i}`;
    }
  }

  return undefined;
}

function buildDiff(original: TraceEvent[], replay: TraceEvent[]): string {
  const originalLines = original.map((event) => stableStringify(event)).join('');
  const replayLines = replay.map((event) => stableStringify(event)).join('');
  return `--- original\n${originalLines}\n--- replay\n${replayLines}`;
}
