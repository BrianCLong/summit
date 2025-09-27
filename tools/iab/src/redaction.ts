import { RedactionConfig, RedactionRecord } from './types.js';

const DEFAULT_SENSITIVE_FIELDS = new Set([
  'name',
  'fullName',
  'email',
  'emailAddress',
  'phone',
  'phoneNumber',
  'ssn',
  'address',
  'location',
  'userId'
]);

const DEFAULT_PATTERNS: Array<{ regex: RegExp; replacement: string; label: string }> = [
  {
    regex: /\b[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g,
    replacement: '<EMAIL:REDACTED>',
    label: 'email pattern'
  },
  {
    regex: /\b\d{3}-\d{2}-\d{4}\b/g,
    replacement: '<SSN:REDACTED>',
    label: 'ssn pattern'
  },
  {
    regex: /\b\+?\d{1,2}[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
    replacement: '<PHONE:REDACTED>',
    label: 'phone pattern'
  }
];

interface RedactionOutcome {
  sanitized: string;
  records: RedactionRecord[];
}

export function redactText(
  content: string,
  config?: RedactionConfig
): RedactionOutcome {
  const records: RedactionRecord[] = [];
  const patterns = [...DEFAULT_PATTERNS];

  if (config?.patterns) {
    for (const pattern of config.patterns) {
      patterns.push({
        regex: new RegExp(pattern.pattern, 'g'),
        replacement: pattern.replacement ?? '<REDACTED>',
        label: `custom pattern ${pattern.pattern}`
      });
    }
  }

  let sanitized = content;

  for (const pattern of patterns) {
    let matches = 0;
    sanitized = sanitized.replace(pattern.regex, () => {
      matches += 1;
      return pattern.replacement;
    });

    if (matches > 0) {
      records.push({ strategy: 'tombstone', target: pattern.label, occurrences: matches });
    }
  }

  return { sanitized, records };
}

export function redactStructuredValue(
  value: unknown,
  config?: RedactionConfig,
  breadcrumbs: string[] = []
): { value: unknown; records: RedactionRecord[] } {
  const records: RedactionRecord[] = [];
  const fieldSet = new Set([
    ...DEFAULT_SENSITIVE_FIELDS,
    ...(config?.fields ?? [])
  ].map((key) => key.toLowerCase()));

  const redact = (input: unknown, path: string[]): unknown => {
    if (Array.isArray(input)) {
      return input.map((item, index) => redact(item, [...path, String(index)]));
    }

    if (input && typeof input === 'object') {
      const output: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(input)) {
        const lowerKey = key.toLowerCase();
        if (fieldSet.has(lowerKey)) {
          records.push({
            strategy: 'tombstone',
            target: [...path, key].join('.'),
            occurrences: 1
          });
          output[key] = '<PII:REDACTED>';
        } else {
          output[key] = redact(val, [...path, key]);
        }
      }
      return output;
    }

    if (typeof input === 'string') {
      const { sanitized, records: textRecords } = redactText(input, config);
      for (const record of textRecords) {
        records.push({
          strategy: record.strategy,
          target: [...path].join('.') || record.target,
          occurrences: record.occurrences
        });
      }
      return sanitized;
    }

    return input;
  };

  const sanitized = redact(value, breadcrumbs);
  return { value: sanitized, records };
}
