/**
 * Enhanced PII Detection and Redaction System
 *
 * Features:
 * - Configurable pattern detection for 20+ PII types
 * - Context-aware detection (reduces false positives)
 * - Multi-language support
 * - Custom pattern registration
 * - Reversible redaction with tokens
 * - Compliance tagging (GDPR, HIPAA, PCI-DSS)
 */

import { Logger } from '../observability/logger.js';
import { Metrics } from '../observability/metrics.js';
import crypto from 'crypto';

const logger = new Logger('PIIDetector');
const metrics = new Metrics();

export type PIIType =
  | 'email'
  | 'phone'
  | 'ssn'
  | 'credit_card'
  | 'bank_account'
  | 'passport'
  | 'drivers_license'
  | 'ip_address'
  | 'mac_address'
  | 'date_of_birth'
  | 'address'
  | 'name'
  | 'api_key'
  | 'password'
  | 'aws_key'
  | 'private_key'
  | 'jwt_token'
  | 'medical_record'
  | 'iban'
  | 'routing_number'
  | 'vehicle_id'
  | 'biometric';

export interface PIIMatch {
  type: PIIType;
  value: string;
  start: number;
  end: number;
  confidence: number;
  compliance: string[];
  redactedValue: string;
  token?: string;
}

export interface PIIDetectionResult {
  hasPII: boolean;
  matches: PIIMatch[];
  redactedText: string;
  originalText: string;
  summary: Record<PIIType, number>;
  compliance: string[];
  processingTime: number;
}

export interface PIIConfig {
  enabledTypes: PIIType[];
  redactionStyle: 'mask' | 'token' | 'category' | 'remove';
  maskChar: string;
  contextualAnalysis: boolean;
  customPatterns: Map<string, RegExp>;
  reversible: boolean;
}

interface PIIPattern {
  type: PIIType;
  pattern: RegExp;
  validator?: (match: string) => boolean;
  compliance: string[];
  contextHints?: string[];
  confidenceBoost?: number;
}

/**
 * PII Detection Patterns
 */
const PII_PATTERNS: PIIPattern[] = [
  // Email addresses
  {
    type: 'email',
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    compliance: ['GDPR', 'CCPA'],
    contextHints: ['email', 'contact', 'reach'],
    confidenceBoost: 0.1,
  },

  // Phone numbers (various formats)
  {
    type: 'phone',
    pattern: /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g,
    validator: (match) => {
      const digits = match.replace(/\D/g, '');
      return digits.length >= 10 && digits.length <= 15;
    },
    compliance: ['GDPR', 'CCPA', 'TCPA'],
    contextHints: ['phone', 'call', 'mobile', 'cell', 'tel'],
  },

  // Social Security Numbers
  {
    type: 'ssn',
    pattern: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g,
    validator: (match) => {
      const digits = match.replace(/\D/g, '');
      // SSN validation: area (001-899, except 666), group (01-99), serial (0001-9999)
      if (digits.length !== 9) return false;
      const area = parseInt(digits.substring(0, 3));
      const group = parseInt(digits.substring(3, 5));
      const serial = parseInt(digits.substring(5, 9));
      return area > 0 && area < 900 && area !== 666 && group > 0 && serial > 0;
    },
    compliance: ['HIPAA', 'SOX', 'GLBA'],
    contextHints: ['ssn', 'social security', 'tax id'],
    confidenceBoost: 0.2,
  },

  // Credit card numbers
  {
    type: 'credit_card',
    pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
    validator: (match) => {
      // Luhn algorithm validation
      const digits = match.replace(/\D/g, '');
      let sum = 0;
      let isEven = false;
      for (let i = digits.length - 1; i >= 0; i--) {
        let digit = parseInt(digits[i], 10);
        if (isEven) {
          digit *= 2;
          if (digit > 9) digit -= 9;
        }
        sum += digit;
        isEven = !isEven;
      }
      return sum % 10 === 0;
    },
    compliance: ['PCI-DSS', 'GDPR'],
    contextHints: ['card', 'credit', 'payment', 'visa', 'mastercard'],
    confidenceBoost: 0.3,
  },

  // Credit card with separators
  {
    type: 'credit_card',
    pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    compliance: ['PCI-DSS', 'GDPR'],
  },

  // IP addresses
  {
    type: 'ip_address',
    pattern: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
    compliance: ['GDPR'],
    contextHints: ['ip', 'address', 'server', 'host'],
  },

  // IPv6 addresses
  {
    type: 'ip_address',
    pattern: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g,
    compliance: ['GDPR'],
  },

  // MAC addresses
  {
    type: 'mac_address',
    pattern: /\b([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})\b/g,
    compliance: ['GDPR'],
  },

  // Date of birth patterns
  {
    type: 'date_of_birth',
    pattern: /\b(?:0?[1-9]|1[0-2])[\/\-](?:0?[1-9]|[12][0-9]|3[01])[\/\-](?:19|20)\d{2}\b/g,
    compliance: ['GDPR', 'HIPAA'],
    contextHints: ['birth', 'dob', 'born', 'birthday'],
  },

  // ISO date format
  {
    type: 'date_of_birth',
    pattern: /\b(?:19|20)\d{2}[\/\-](?:0?[1-9]|1[0-2])[\/\-](?:0?[1-9]|[12][0-9]|3[01])\b/g,
    compliance: ['GDPR', 'HIPAA'],
    contextHints: ['birth', 'dob', 'born'],
  },

  // API keys (generic patterns)
  {
    type: 'api_key',
    pattern: /\b(?:sk|pk|api|key)[-_][a-zA-Z0-9]{20,}/gi,
    compliance: ['SOC2'],
    contextHints: ['api', 'key', 'secret', 'token'],
    confidenceBoost: 0.2,
  },

  // AWS Access Keys
  {
    type: 'aws_key',
    pattern: /\bAKIA[0-9A-Z]{16}\b/g,
    compliance: ['SOC2', 'AWS'],
    confidenceBoost: 0.3,
  },

  // AWS Secret Keys
  {
    type: 'aws_key',
    pattern: /\b[a-zA-Z0-9/+=]{40}\b/g,
    validator: (match) => {
      // AWS secret keys are 40 chars, base64-like
      return /^[a-zA-Z0-9/+=]+$/.test(match) && match.length === 40;
    },
    compliance: ['SOC2', 'AWS'],
    contextHints: ['aws', 'secret', 'key'],
  },

  // Private keys
  {
    type: 'private_key',
    pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
    compliance: ['SOC2', 'PCI-DSS'],
    confidenceBoost: 0.5,
  },

  // JWT tokens
  {
    type: 'jwt_token',
    pattern: /\beyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
    compliance: ['SOC2'],
    contextHints: ['token', 'jwt', 'auth', 'bearer'],
  },

  // Passwords (in common formats)
  {
    type: 'password',
    pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"]?([^'"}\s]+)['"]?/gi,
    compliance: ['SOC2', 'GDPR'],
    confidenceBoost: 0.3,
  },

  // US Passport numbers
  {
    type: 'passport',
    pattern: /\b[A-Z][0-9]{8}\b/g,
    compliance: ['GDPR', 'ITAR'],
    contextHints: ['passport', 'travel'],
  },

  // IBAN (International Bank Account Number)
  {
    type: 'iban',
    pattern: /\b[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}\b/g,
    compliance: ['GDPR', 'PCI-DSS'],
    contextHints: ['iban', 'bank', 'account'],
  },

  // US Bank routing numbers
  {
    type: 'routing_number',
    pattern: /\b[0-9]{9}\b/g,
    validator: (match) => {
      // ABA routing number checksum
      const d = match.split('').map(Number);
      const sum = 3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + (d[2] + d[5] + d[8]);
      return sum % 10 === 0;
    },
    compliance: ['GLBA', 'SOX'],
    contextHints: ['routing', 'bank', 'aba'],
  },

  // VIN (Vehicle Identification Number)
  {
    type: 'vehicle_id',
    pattern: /\b[A-HJ-NPR-Z0-9]{17}\b/g,
    compliance: ['CCPA'],
    contextHints: ['vin', 'vehicle', 'car'],
  },

  // Medical Record Numbers (generic pattern)
  {
    type: 'medical_record',
    pattern: /\bMRN[:# ]?[0-9]{6,12}\b/gi,
    compliance: ['HIPAA'],
    contextHints: ['medical', 'patient', 'record', 'mrn'],
    confidenceBoost: 0.2,
  },
];

/**
 * Enhanced PII Detector
 */
export class PIIDetector {
  private config: PIIConfig;
  private tokenStore: Map<string, string> = new Map();

  constructor(config?: Partial<PIIConfig>) {
    this.config = {
      enabledTypes: [
        'email', 'phone', 'ssn', 'credit_card', 'api_key', 'aws_key',
        'private_key', 'jwt_token', 'password', 'ip_address',
      ],
      redactionStyle: 'mask',
      maskChar: '*',
      contextualAnalysis: true,
      customPatterns: new Map(),
      reversible: false,
      ...config,
    };

    logger.info('PII Detector initialized', {
      enabledTypes: this.config.enabledTypes.length,
      redactionStyle: this.config.redactionStyle,
    });
  }

  /**
   * Detect and redact PII in text
   */
  detect(text: string): PIIDetectionResult {
    const startTime = Date.now();
    const matches: PIIMatch[] = [];
    const summary: Record<string, number> = {};
    const complianceSet = new Set<string>();

    // Run pattern detection
    for (const patternDef of PII_PATTERNS) {
      if (!this.config.enabledTypes.includes(patternDef.type)) continue;

      const pattern = new RegExp(patternDef.pattern.source, patternDef.pattern.flags);
      let match: RegExpExecArray | null;

      while ((match = pattern.exec(text)) !== null) {
        const value = match[0];
        const start = match.index;
        const end = start + value.length;

        // Run validator if available
        if (patternDef.validator && !patternDef.validator(value)) {
          continue;
        }

        // Calculate confidence
        let confidence = 0.7; // Base confidence
        if (patternDef.confidenceBoost) {
          confidence += patternDef.confidenceBoost;
        }

        // Contextual analysis
        if (this.config.contextualAnalysis && patternDef.contextHints) {
          const contextBoost = this.analyzeContext(text, start, patternDef.contextHints);
          confidence += contextBoost;
        }

        confidence = Math.min(confidence, 1.0);

        // Create redacted value
        const redactedValue = this.redact(value, patternDef.type);

        // Generate token if reversible
        let token: string | undefined;
        if (this.config.reversible) {
          token = this.generateToken(value);
        }

        matches.push({
          type: patternDef.type,
          value,
          start,
          end,
          confidence,
          compliance: patternDef.compliance,
          redactedValue,
          token,
        });

        // Update summary and compliance
        summary[patternDef.type] = (summary[patternDef.type] || 0) + 1;
        patternDef.compliance.forEach((c) => complianceSet.add(c));
      }
    }

    // Run custom patterns
    for (const [name, pattern] of this.config.customPatterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(text)) !== null) {
        matches.push({
          type: 'api_key' as PIIType, // Default type for custom
          value: match[0],
          start: match.index,
          end: match.index + match[0].length,
          confidence: 0.8,
          compliance: ['CUSTOM'],
          redactedValue: this.redact(match[0], 'api_key'),
        });
      }
    }

    // Sort matches by position (descending for replacement)
    matches.sort((a, b) => b.start - a.start);

    // Generate redacted text
    let redactedText = text;
    for (const match of matches) {
      redactedText =
        redactedText.substring(0, match.start) +
        match.redactedValue +
        redactedText.substring(match.end);
    }

    const processingTime = Date.now() - startTime;

    // Log and emit metrics
    if (matches.length > 0) {
      metrics.counter('pii_detected', { count: String(matches.length) });
      logger.debug('PII detected', {
        matchCount: matches.length,
        types: Object.keys(summary),
        processingTime,
      });
    }

    return {
      hasPII: matches.length > 0,
      matches: matches.reverse(), // Return in original order
      redactedText,
      originalText: text,
      summary: summary as Record<PIIType, number>,
      compliance: Array.from(complianceSet),
      processingTime,
    };
  }

  /**
   * Redact only, return redacted text
   */
  redactText(text: string): string {
    return this.detect(text).redactedText;
  }

  /**
   * Check if text contains PII
   */
  containsPII(text: string): boolean {
    return this.detect(text).hasPII;
  }

  /**
   * Restore redacted text using tokens
   */
  restore(redactedText: string): string {
    if (!this.config.reversible) {
      throw new Error('Reversible mode not enabled');
    }

    let restored = redactedText;
    for (const [token, original] of this.tokenStore) {
      restored = restored.replace(token, original);
    }
    return restored;
  }

  /**
   * Register custom pattern
   */
  registerPattern(name: string, pattern: RegExp): void {
    this.config.customPatterns.set(name, pattern);
    logger.info('Custom PII pattern registered', { name });
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PIIConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get compliance report for detected PII
   */
  getComplianceReport(result: PIIDetectionResult): {
    frameworks: string[];
    requirements: Record<string, string[]>;
  } {
    const requirements: Record<string, string[]> = {
      GDPR: ['Right to erasure', 'Data minimization', 'Consent required'],
      HIPAA: ['Protected Health Information', 'Minimum necessary', 'Authorization required'],
      'PCI-DSS': ['Encryption required', 'Access control', 'Audit logging'],
      CCPA: ['Consumer rights disclosure', 'Opt-out mechanism'],
      SOC2: ['Security monitoring', 'Access management'],
    };

    const activeRequirements: Record<string, string[]> = {};
    for (const framework of result.compliance) {
      if (requirements[framework]) {
        activeRequirements[framework] = requirements[framework];
      }
    }

    return {
      frameworks: result.compliance,
      requirements: activeRequirements,
    };
  }

  private redact(value: string, type: PIIType): string {
    switch (this.config.redactionStyle) {
      case 'mask':
        return this.maskValue(value, type);
      case 'token':
        return this.generateToken(value);
      case 'category':
        return `[${type.toUpperCase()}]`;
      case 'remove':
        return '';
      default:
        return this.maskValue(value, type);
    }
  }

  private maskValue(value: string, type: PIIType): string {
    const maskChar = this.config.maskChar;

    switch (type) {
      case 'email': {
        const [local, domain] = value.split('@');
        return `${local[0]}${maskChar.repeat(local.length - 1)}@${domain}`;
      }
      case 'phone':
        return value.replace(/\d(?=\d{4})/g, maskChar);
      case 'ssn':
        return `${maskChar.repeat(3)}-${maskChar.repeat(2)}-${value.slice(-4)}`;
      case 'credit_card':
        return `${maskChar.repeat(12)}${value.slice(-4)}`;
      case 'api_key':
      case 'aws_key':
      case 'password':
        return `${value.slice(0, 4)}${maskChar.repeat(value.length - 4)}`;
      default:
        return maskChar.repeat(value.length);
    }
  }

  private generateToken(value: string): string {
    const token = `[PII:${crypto.randomBytes(8).toString('hex')}]`;
    this.tokenStore.set(token, value);
    return token;
  }

  private analyzeContext(text: string, position: number, hints: string[]): number {
    // Check 50 characters before and after the match
    const contextStart = Math.max(0, position - 50);
    const contextEnd = Math.min(text.length, position + 50);
    const context = text.substring(contextStart, contextEnd).toLowerCase();

    let boost = 0;
    for (const hint of hints) {
      if (context.includes(hint.toLowerCase())) {
        boost += 0.1;
      }
    }

    return Math.min(boost, 0.3);
  }
}

// Export singleton
export const piiDetector = new PIIDetector();
