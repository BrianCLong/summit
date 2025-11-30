import { parseDuration, WindowKind } from './types.js';

export function parseRule(text) {
  const tokens = text.trim().split(/\s+/);
  const rule = {
    everyMs: null,
    withinMs: null,
    window: null,
    watermarkMs: 0,
    sequence: []
  };

  let idx = 0;
  while (idx < tokens.length) {
    const token = tokens[idx].toUpperCase();
    if (token === 'EVERY') {
      rule.everyMs = parseDuration(tokens[++idx]);
    } else if (token === 'AFTER') {
      const eventName = tokens[++idx];
      rule.sequence.push({ name: eventName });
    } else if (token === 'WITHIN') {
      rule.withinMs = parseDuration(tokens[++idx]);
    } else if (token === 'WINDOW') {
      const kind = tokens[++idx].toUpperCase();
      const duration = parseDuration(tokens[++idx]);
      const slide = kind === WindowKind.SLIDING && tokens[idx + 1]?.match(/\d/)
        ? parseDuration(tokens[++idx])
        : duration;
      rule.window = { kind, durationMs: duration, slideMs: slide };
    } else if (token === 'WATERMARK') {
      rule.watermarkMs = parseDuration(tokens[++idx]);
    } else {
      idx += 1;
      continue;
    }
    idx += 1;
  }

  if (rule.sequence.length === 0) {
    throw new Error('Rule must declare at least one event with AFTER');
  }

  return rule;
}
