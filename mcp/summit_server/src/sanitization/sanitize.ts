import type { JsonValue } from '../utils/stable-json.js';

const injectionPatterns = [
  /^system:/i,
  /^assistant:/i,
  /^developer:/i,
  /<\/?script/i,
  /\btool\s*:\s*/i,
];

const sanitizeString = (value: string): string => {
  const lines = value
    .split('\n')
    .filter((line) => !injectionPatterns.some((pattern) => pattern.test(line)));
  return lines.join('\n').trim();
};

export const sanitizeOutput = (value: JsonValue): JsonValue => {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeOutput(entry));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).reduce<Record<string, JsonValue>>(
      (acc, [key, entry]) => {
        acc[key] = sanitizeOutput(entry as JsonValue);
        return acc;
      },
      {},
    );
  }
  if (typeof value === 'string') {
    return sanitizeString(value);
  }
  return value;
};
