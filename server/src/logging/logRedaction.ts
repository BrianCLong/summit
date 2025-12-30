const SECRET_PATTERNS: { regex: RegExp; replacement: string }[] = [
  // GitHub tokens (ghp_/gho_/ghs_/ghr_...)
  { regex: /(gh[pousr]_[A-Za-z0-9]{20,})/gi, replacement: '[REDACTED_GITHUB_TOKEN]' },
  // Slack tokens (xox...) 
  { regex: /(xox[baprs]-[A-Za-z0-9-]{10,})/gi, replacement: '[REDACTED_SLACK_TOKEN]' },
  // AWS access key and secret on the same line
  { regex: /(AKIA[0-9A-Z]{16})([:\s]+)([A-Za-z0-9\/+=]{32,})/g, replacement: '[REDACTED_AWS_KEY]$2[REDACTED_AWS_SECRET]' },
  // Generic bearer token header
  { regex: /(bearer\s+)[A-Za-z0-9\-._~+/]+=*/gi, replacement: '$1[REDACTED]' },
  // Generic key=value style secrets
  {
    regex: /(\b(?:api[_-]?key|token|secret|password|session[_-]?id)\b)\s*[:=]\s*([A-Za-z0-9._~+\-/]{8,})/gi,
    replacement: '$1=[REDACTED]',
  },
];

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

export function redactLogLine(line: string): string {
  return SECRET_PATTERNS.reduce((current, pattern) => current.replace(pattern.regex, pattern.replacement), line);
}

function sanitizeValue(value: unknown, seen: WeakSet<object>): unknown {
  if (typeof value === 'string') return redactLogLine(value);
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return value;
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeValue(entry, seen));
  }

  if (isPlainObject(value)) {
    return Object.entries(value).reduce<Record<string, unknown>>((acc, [key, val]) => {
      acc[key] = sanitizeValue(val, seen);
      return acc;
    }, {});
  }

  return value;
}

export function sanitizeLogArguments(args: unknown[]): unknown[] {
  const seen = new WeakSet<object>();
  return args.map((value) => sanitizeValue(value, seen));
}
