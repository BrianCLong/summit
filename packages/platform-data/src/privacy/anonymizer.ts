/**
 * P39-40: Privacy and Data Anonymization
 * PII detection, masking, and anonymization utilities
 */

import { createHash } from 'node:crypto';
import { z } from 'zod';

/**
 * PII types that can be detected and anonymized
 */
export type PIIType =
  | 'email'
  | 'phone'
  | 'ssn'
  | 'credit_card'
  | 'ip_address'
  | 'name'
  | 'address'
  | 'date_of_birth'
  | 'passport'
  | 'drivers_license';

/**
 * Anonymization strategy
 */
export type AnonymizationStrategy =
  | 'hash'
  | 'mask'
  | 'redact'
  | 'generalize'
  | 'pseudonymize'
  | 'tokenize';

/**
 * PII detection result
 */
export interface PIIDetection {
  type: PIIType;
  value: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
}

/**
 * Anonymization rule
 */
export interface AnonymizationRule {
  type: PIIType;
  strategy: AnonymizationStrategy;
  options?: {
    maskChar?: string;
    preserveLength?: boolean;
    preserveFormat?: boolean;
    salt?: string;
  };
}

/**
 * Default anonymization rules
 */
export const DEFAULT_RULES: AnonymizationRule[] = [
  { type: 'email', strategy: 'mask', options: { preserveFormat: true } },
  { type: 'phone', strategy: 'mask', options: { preserveLength: true, maskChar: '*' } },
  { type: 'ssn', strategy: 'redact' },
  { type: 'credit_card', strategy: 'mask', options: { preserveLength: true } },
  { type: 'ip_address', strategy: 'generalize' },
  { type: 'name', strategy: 'pseudonymize' },
  { type: 'address', strategy: 'generalize' },
  { type: 'date_of_birth', strategy: 'generalize' },
];

/**
 * PII detection patterns
 */
const PII_PATTERNS: Record<PIIType, RegExp> = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
  phone: /\b(?:\+?1[-.\s]?)?(?:\([0-9]{3}\)|[0-9]{3})[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
  ssn: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
  credit_card: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  ip_address: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  name: /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g,
  address: /\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct)\b/gi,
  date_of_birth: /\b(?:\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b/g,
  passport: /\b[A-Z]{1,2}\d{6,9}\b/g,
  drivers_license: /\b[A-Z]{1,2}\d{5,8}\b/g,
};

/**
 * Detect PII in text
 */
export function detectPII(text: string, types?: PIIType[]): PIIDetection[] {
  const detections: PIIDetection[] = [];
  const typesToCheck = types || (Object.keys(PII_PATTERNS) as PIIType[]);

  for (const type of typesToCheck) {
    const pattern = PII_PATTERNS[type];
    if (!pattern) continue;

    let match;
    const regex = new RegExp(pattern.source, pattern.flags);

    while ((match = regex.exec(text)) !== null) {
      detections.push({
        type,
        value: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        confidence: 0.9, // Simplified confidence
      });
    }
  }

  return detections.sort((a, b) => a.startIndex - b.startIndex);
}

/**
 * Hash a value for pseudonymization
 */
export function hashValue(value: string, salt = ''): string {
  return createHash('sha256')
    .update(value + salt)
    .digest('hex')
    .substring(0, 16);
}

/**
 * Mask a string value
 */
export function maskValue(
  value: string,
  options: {
    maskChar?: string;
    preserveLength?: boolean;
    preserveStart?: number;
    preserveEnd?: number;
  } = {}
): string {
  const {
    maskChar = '*',
    preserveLength = true,
    preserveStart = 0,
    preserveEnd = 0,
  } = options;

  if (value.length <= preserveStart + preserveEnd) {
    return maskChar.repeat(value.length);
  }

  const start = value.substring(0, preserveStart);
  const end = value.substring(value.length - preserveEnd);
  const maskLength = preserveLength
    ? value.length - preserveStart - preserveEnd
    : 8;

  return start + maskChar.repeat(maskLength) + end;
}

/**
 * Mask an email address
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return maskValue(email);

  const maskedLocal = maskValue(local, { preserveStart: 1, preserveEnd: 1 });
  const [domainName, tld] = domain.split('.');
  const maskedDomain = domainName ? maskValue(domainName, { preserveStart: 1 }) : domain;

  return `${maskedLocal}@${maskedDomain}.${tld || 'com'}`;
}

/**
 * Generalize a value (reduce precision)
 */
export function generalizeValue(value: string, type: PIIType): string {
  switch (type) {
    case 'ip_address': {
      const parts = value.split('.');
      if (parts.length === 4) {
        return `${parts[0]}.${parts[1]}.0.0`;
      }
      return value;
    }

    case 'date_of_birth': {
      // Keep only the year
      const yearMatch = value.match(/\d{4}/);
      if (yearMatch) {
        return `${yearMatch[0]}-XX-XX`;
      }
      return 'XXXX-XX-XX';
    }

    case 'address': {
      // Keep only city-level
      return '[Address Generalized]';
    }

    default:
      return '[Generalized]';
  }
}

/**
 * Tokenize a value (replace with a consistent token)
 */
const tokenMap = new Map<string, string>();
let tokenCounter = 0;

export function tokenizeValue(value: string, type: PIIType): string {
  const key = `${type}:${value}`;
  if (!tokenMap.has(key)) {
    tokenMap.set(key, `TOKEN_${type.toUpperCase()}_${++tokenCounter}`);
  }
  return tokenMap.get(key)!;
}

/**
 * Clear token map (for testing)
 */
export function clearTokenMap(): void {
  tokenMap.clear();
  tokenCounter = 0;
}

/**
 * Apply anonymization strategy to a value
 */
export function anonymizeValue(
  value: string,
  type: PIIType,
  strategy: AnonymizationStrategy,
  options: AnonymizationRule['options'] = {}
): string {
  switch (strategy) {
    case 'hash':
      return hashValue(value, options.salt);

    case 'mask':
      if (type === 'email') {
        return maskEmail(value);
      }
      return maskValue(value, {
        maskChar: options.maskChar,
        preserveLength: options.preserveLength,
        preserveStart: 2,
        preserveEnd: 2,
      });

    case 'redact':
      return `[REDACTED-${type.toUpperCase()}]`;

    case 'generalize':
      return generalizeValue(value, type);

    case 'pseudonymize':
      return `Person_${hashValue(value, options.salt).substring(0, 8)}`;

    case 'tokenize':
      return tokenizeValue(value, type);

    default:
      return '[ANONYMIZED]';
  }
}

/**
 * Data Anonymizer class
 */
export class DataAnonymizer {
  private rules: Map<PIIType, AnonymizationRule>;

  constructor(rules: AnonymizationRule[] = DEFAULT_RULES) {
    this.rules = new Map(rules.map(r => [r.type, r]));
  }

  /**
   * Add or update a rule
   */
  setRule(rule: AnonymizationRule): void {
    this.rules.set(rule.type, rule);
  }

  /**
   * Get rule for a PII type
   */
  getRule(type: PIIType): AnonymizationRule | undefined {
    return this.rules.get(type);
  }

  /**
   * Anonymize text
   */
  anonymizeText(text: string, types?: PIIType[]): string {
    const detections = detectPII(text, types);
    let result = text;
    let offset = 0;

    for (const detection of detections) {
      const rule = this.rules.get(detection.type);
      if (!rule) continue;

      const anonymized = anonymizeValue(
        detection.value,
        detection.type,
        rule.strategy,
        rule.options
      );

      const start = detection.startIndex + offset;
      const end = detection.endIndex + offset;

      result = result.substring(0, start) + anonymized + result.substring(end);
      offset += anonymized.length - detection.value.length;
    }

    return result;
  }

  /**
   * Anonymize an object
   */
  anonymizeObject<T extends Record<string, unknown>>(
    obj: T,
    fieldRules?: Record<string, PIIType>
  ): T {
    const result = { ...obj };

    for (const [key, value] of Object.entries(result)) {
      if (typeof value === 'string') {
        // Check if field has explicit rule
        const piiType = fieldRules?.[key];
        if (piiType) {
          const rule = this.rules.get(piiType);
          if (rule) {
            (result as Record<string, unknown>)[key] = anonymizeValue(
              value,
              piiType,
              rule.strategy,
              rule.options
            );
          }
        } else {
          // Auto-detect and anonymize
          (result as Record<string, unknown>)[key] = this.anonymizeText(value);
        }
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        (result as Record<string, unknown>)[key] = this.anonymizeObject(
          value as Record<string, unknown>,
          fieldRules
        );
      } else if (Array.isArray(value)) {
        (result as Record<string, unknown>)[key] = value.map(item =>
          typeof item === 'string'
            ? this.anonymizeText(item)
            : typeof item === 'object' && item !== null
            ? this.anonymizeObject(item as Record<string, unknown>, fieldRules)
            : item
        );
      }
    }

    return result;
  }

  /**
   * Create an anonymized copy with audit trail
   */
  anonymizeWithAudit<T extends Record<string, unknown>>(
    obj: T,
    fieldRules?: Record<string, PIIType>
  ): {
    data: T;
    audit: Array<{
      field: string;
      originalType: PIIType;
      strategy: AnonymizationStrategy;
    }>;
  } {
    const audit: Array<{
      field: string;
      originalType: PIIType;
      strategy: AnonymizationStrategy;
    }> = [];

    const processField = (
      value: unknown,
      path: string
    ): unknown => {
      if (typeof value === 'string') {
        const detections = detectPII(value);
        for (const detection of detections) {
          const rule = this.rules.get(detection.type);
          if (rule) {
            audit.push({
              field: path,
              originalType: detection.type,
              strategy: rule.strategy,
            });
          }
        }
        return this.anonymizeText(value);
      }

      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          return value.map((item, index) =>
            processField(item, `${path}[${index}]`)
          );
        }
        const result: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(value)) {
          result[key] = processField(val, path ? `${path}.${key}` : key);
        }
        return result;
      }

      return value;
    };

    const data = processField(obj, '') as T;

    return { data, audit };
  }
}

/**
 * Default anonymizer instance
 */
export const anonymizer = new DataAnonymizer();

/**
 * Create anonymizer with custom rules
 */
export function createAnonymizer(rules?: AnonymizationRule[]): DataAnonymizer {
  return new DataAnonymizer(rules);
}
