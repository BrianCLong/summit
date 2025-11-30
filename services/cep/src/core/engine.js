import { v4 as uuidv4 } from 'uuid';
import { parseRule } from './dsl.js';
import { windowForTimestamp, windowLabel } from './windows.js';
import { sanitizePayload } from './types.js';
import { Watermark } from './watermark.js';

export class RuleRuntime {
  constructor({ adapters, clock = () => Date.now() }) {
    this.adapters = adapters;
    this.clock = clock;
    this.rules = new Map();
    this.runs = new Map();
  }

  registerRule(ruleText) {
    const parsed = parseRule(ruleText);
    const ruleId = uuidv4();
    const runId = uuidv4();
    this.rules.set(ruleId, { ruleId, parsed, createdAt: this.clock() });
    this.runs.set(runId, { ruleId, runId, matches: [], emitted: [], createdAt: this.clock() });
    return { ruleId, runId };
  }

  async evaluate(runId, events) {
    const run = this.runs.get(runId);
    if (!run) {
      throw new Error('Unknown run');
    }
    const rule = this.rules.get(run.ruleId);
    const watermark = new Watermark({ allowedLatenessMs: rule.parsed.watermarkMs || 0 });
    const sequence = rule.parsed.sequence.map(({ name }) => ({ name, matched: false, ts: null }));
    const matches = [];

    for (const event of events) {
      const ts = event.timestamp || this.clock();
      watermark.observe(ts);
      if (watermark.isLate(ts)) {
        continue;
      }
      const idx = sequence.findIndex((step) => !step.matched && step.name === event.name);
      if (idx !== -1) {
        sequence[idx].matched = true;
        sequence[idx].ts = ts;
      }
      const withinLimit = rule.parsed.withinMs
        ? sequence.every((step) => !step.matched || (Math.max(...sequence.filter((s) => s.matched).map((s) => s.ts)) - Math.min(...sequence.filter((s) => s.matched).map((s) => s.ts)) <= rule.parsed.withinMs))
        : true;
      if (sequence.every((step) => step.matched) && withinLimit) {
        const window = rule.parsed.window
          ? windowForTimestamp(rule.parsed.window.kind, rule.parsed.window.durationMs, rule.parsed.window.slideMs, ts)
          : null;
        const label = window ? windowLabel(window) : 'global';
        const match = { id: uuidv4(), window: label, events: sequence.map((s) => ({ name: s.name, ts: s.ts })), lac: event.lac || null };
        matches.push(match);
        sequence.forEach((step) => { step.matched = false; step.ts = null; });
      }
    }

    const emitted = await Promise.all(matches.map((match) => this.emit(run.ruleId, match)));
    const record = { ...run, matches, emitted, updatedAt: this.clock() };
    this.runs.set(runId, record);
    return record;
  }

  async emit(ruleId, match) {
    const idempotencyKey = `${ruleId}:${match.id}`;
    await this.adapters.redis.remember(idempotencyKey);
    const payload = { ruleId, match: { ...match, events: match.events.map((e) => ({ name: e.name, ts: e.ts })) } };
    await this.adapters.kafka.emit(payload, { idempotencyKey, labels: { lac: match.lac || 'n/a' } });
    return { id: match.id, idempotencyKey, window: match.window };
  }

  getRun(runId) {
    return this.runs.get(runId);
  }
}

export async function dryRun(ruleText, events, adapters) {
  const runtime = new RuleRuntime({ adapters });
  const { runId } = runtime.registerRule(ruleText);
  return runtime.evaluate(runId, events);
}

export function metadataOnlyEvent(event) {
  return {
    id: event.id || uuidv4(),
    name: event.name,
    timestamp: event.timestamp,
    labels: event.labels || {},
    lac: event.lac || null,
    payload: sanitizePayload(event.payload)
  };
}
