#!/usr/bin/env ts-node
/**
 * Securiteyes IG Polygraph
 * Heuristic, defensive-only analyzer for deception-risk signals in text artifacts.
 *
 * Input sources (first match wins):
 *   1. `POLYGRAPH_INPUT` environment variable (single blob of text).
 *   2. `polygraph_input.json` with shape `{ "items": [{ "id": string, "text": string }] }`.
 *   3. `polygraph_input.txt` newline separated entries.
 *
 * Output: writes `polygraph.json` with `{ score, confidence, signals, guidance }`.
 * Signals are advisory only and must not be used for personal attribution.
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';

type PolygraphItem = { id: string; text: string };

type PolygraphResult = {
  tool: string;
  score: number;
  confidence: 'low' | 'med' | 'high';
  signals: Array<Record<string, unknown>>;
  guidance: string[];
};

function loadItems(): PolygraphItem[] {
  const envText = process.env.POLYGRAPH_INPUT;
  if (envText && envText.trim().length > 0) {
    return [{ id: 'env', text: envText }];
  }

  if (existsSync('polygraph_input.json')) {
    try {
      const payload = JSON.parse(readFileSync('polygraph_input.json', 'utf-8')) as { items?: Array<{ id?: string; text?: string }> };
      if (Array.isArray(payload.items)) {
        return payload.items.map((item, index) => ({
          id: String(item.id ?? index),
          text: String(item.text ?? ''),
        }));
      }
    } catch (error) {
      console.warn('[polygraph] failed to parse polygraph_input.json:', (error as Error).message);
    }
  }

  if (existsSync('polygraph_input.txt')) {
    const lines = readFileSync('polygraph_input.txt', 'utf-8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length > 0) {
      return lines.map((text, index) => ({ id: String(index + 1), text }));
    }
  }

  return [];
}

const HEDGES = /\b(should|could|might|maybe|perhaps|hopefully|appears to|seems to)\b/i;
const URGENCY = /\b(urgent|asap|immediately|now|cannot wait|critical fix)\b/i;
const PASSIVE = /\b(is|was|were|be|been|being)\s+(?:\w+ed)\b/i;
const ABSOLUTES = /\b(always|never|everyone|no one|guaranteed)\b/i;
const VAGUE = /\b(thing|things|stuff|issue|issues|fix|fixed|fixes)\b/i;
const JUSTIFICATION = /\b(because|therefore|hence|so that|due to)\b/i;

function scoreText(text: string, signals: Array<Record<string, unknown>>): number {
  let score = 0;

  if (HEDGES.test(text)) {
    score += 8;
    signals.push({ type: 'hedging', sample: text.slice(0, 160) });
  }
  if (URGENCY.test(text)) {
    score += 6;
    signals.push({ type: 'urgency', sample: text.slice(0, 160) });
  }
  if (PASSIVE.test(text)) {
    score += 5;
    signals.push({ type: 'passive_voice', sample: text.slice(0, 160) });
  }
  if (ABSOLUTES.test(text)) {
    score += 5;
    signals.push({ type: 'absolutes', sample: text.slice(0, 160) });
  }
  if (VAGUE.test(text)) {
    score += 4;
    signals.push({ type: 'vagueness', sample: text.slice(0, 160) });
  }
  if (!JUSTIFICATION.test(text)) {
    score += 3;
    signals.push({ type: 'missing_justification_hint', sample: text.slice(0, 160) });
  }

  return Math.min(30, score);
}

const items = loadItems();
const signals: Array<Record<string, unknown>> = [];
let aggregate = 0;

for (const item of items) {
  aggregate += scoreText(item.text ?? '', signals);
}

let riskScore = 0;
if (items.length > 0) {
  riskScore = Math.round(Math.min(100, (aggregate / (items.length * 30)) * 100));
}

const confidence: PolygraphResult['confidence'] = riskScore >= 75 ? 'high' : riskScore >= 40 ? 'med' : 'low';

const result: PolygraphResult = {
  tool: 'Securiteyes Polygraph (heuristic, defensive)',
  score: riskScore,
  confidence,
  signals,
  guidance: [
    'Treat polygraph scores as advisory. Corroborate with at least three independent signals.',
    'Prioritize controls and mitigations over personal attribution.',
    'Request clarifying evidence where vagueness or hedging is elevated.',
  ],
};

writeFileSync('polygraph.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
