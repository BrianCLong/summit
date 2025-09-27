import {
  makeReplacement,
  stableHash,
  HASH_PREFIX,
  HASH_SUFFIX,
} from './utils.js';
import { RedactionOptions, RedactedSpan } from './types.js';

interface PatternDescriptor {
  label: string;
  regex: RegExp;
}

const DEFAULT_PATTERNS: PatternDescriptor[] = [
  { label: 'EMAIL', regex: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  {
    label: 'PHONE',
    regex: /\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?){2}\d{4}\b/g,
  },
  { label: 'SSN', regex: /\b\d{3}-\d{2}-\d{4}\b/g },
  { label: 'CARD', regex: /\b(?:\d[ -]?){13,16}\b/g },
];

const SPOM_PATTERN = /<spom\b([^>]*)>([\s\S]*?)<\/spom>/gi;

function extractSpomLabel(attributes: string): string {
  const trimmed = attributes.trim();
  if (!trimmed) {
    return 'SPOM';
  }

  const labelMatch = trimmed.match(/(?:pii|type|label)\s*=\s*"([^"]+)"/i);
  if (labelMatch) {
    return labelMatch[1].toUpperCase();
  }

  return 'SPOM';
}

function hasReplacementToken(value: string): boolean {
  return value.includes(HASH_PREFIX) && value.includes(HASH_SUFFIX);
}

function applySpomRedaction(
  content: string,
  salt: string,
  spans: RedactedSpan[],
): string {
  let sanitized = '';
  let lastIndex = 0;
  let occurrenceTracker = 0;

  for (const match of content.matchAll(SPOM_PATTERN)) {
    const index = match.index ?? 0;
    const fullMatch = match[0];
    const attributes = match[1] ?? '';
    const inner = match[2] ?? '';
    const label = extractSpomLabel(attributes);
    const hash = stableHash(inner, salt);
    const replacement = makeReplacement(label, hash);

    sanitized += content.slice(lastIndex, index);
    sanitized += replacement;
    spans.push({ label, hash, replacement, occurrence: ++occurrenceTracker });
    lastIndex = index + fullMatch.length;
  }

  sanitized += content.slice(lastIndex);
  return sanitized;
}

export function redactSensitive(
  content: string,
  options: RedactionOptions = {},
): { sanitized: string; redactions: RedactedSpan[] } {
  const salt = options.hashSalt ?? 'pfpt';
  const spans: RedactedSpan[] = [];
  const allPatterns: PatternDescriptor[] = [
    ...DEFAULT_PATTERNS,
    ...(options.additionalPatterns ?? []),
  ];

  let sanitized = applySpomRedaction(content, salt, spans);

  for (const pattern of allPatterns) {
    sanitized = sanitized.replace(pattern.regex, (value) => {
      if (hasReplacementToken(value)) {
        return value;
      }

      const hash = stableHash(value, salt);
      const replacement = makeReplacement(pattern.label, hash);
      spans.push({ label: pattern.label, hash, replacement, occurrence: spans.length + 1 });
      return replacement;
    });
  }

  return { sanitized, redactions: spans };
}
