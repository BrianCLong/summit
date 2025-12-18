import { WindowKind } from './types.js';

export function windowForTimestamp(kind, durationMs, slideMs, timestamp) {
  if (kind === WindowKind.TUMBLING) {
    const start = Math.floor(timestamp / durationMs) * durationMs;
    return { start, end: start + durationMs };
  }
  const bucket = Math.floor(timestamp / slideMs);
  const start = bucket * slideMs;
  return { start, end: start + durationMs };
}

export function windowLabel(window) {
  return `${new Date(window.start).toISOString()}-${new Date(window.end).toISOString()}`;
}
