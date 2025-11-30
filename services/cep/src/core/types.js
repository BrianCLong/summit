export const WindowKind = {
  TUMBLING: 'TUMBLING',
  SLIDING: 'SLIDING'
};

export function parseDuration(input) {
  const match = /^(\d+)(ms|s|m|h)$/.exec(input.trim());
  if (!match) {
    throw new Error(`Invalid duration: ${input}`);
  }
  const value = Number(match[1]);
  const unit = match[2];
  const multipliers = { ms: 1, s: 1000, m: 60000, h: 3600000 };
  return value * multipliers[unit];
}

export function sanitizePayload(payload) {
  if (payload == null || typeof payload !== 'object') {
    return {};
  }
  const sanitized = {};
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === 'string') {
      continue;
    }
    sanitized[key] = value;
  }
  return sanitized;
}
