import {
  SensitiveDataType,
  SensitiveDataFlag,
} from '../types/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('SensitiveDataDetector');

/**
 * Pattern definitions for sensitive data detection
 */
const DETECTION_PATTERNS: Record<SensitiveDataType, DetectionRule[]> = {
  [SensitiveDataType.PII]: [
    { name: 'SSN', pattern: /\b\d{3}-\d{2}-\d{4}\b/g, confidence: 0.95 },
    { name: 'SSN_ALT', pattern: /\b\d{9}\b(?=.*(?:ssn|social))/gi, confidence: 0.85 },
    { name: 'EMAIL', pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, confidence: 0.9 },
    { name: 'PHONE', pattern: /\b(?:\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, confidence: 0.85 },
    { name: 'PASSPORT', pattern: /\b[A-Z]{1,2}\d{6,9}\b/g, confidence: 0.7 },
    { name: 'DL', pattern: /\b[A-Z]{1,2}\d{5,8}\b(?=.*(?:license|dl|driver))/gi, confidence: 0.75 },
  ],
  [SensitiveDataType.PHI]: [
    { name: 'MRN', pattern: /\bMRN[-:\s]?\d{6,10}\b/gi, confidence: 0.9 },
    { name: 'ICD10', pattern: /\b[A-Z]\d{2}(?:\.\d{1,4})?\b/g, confidence: 0.6 },
    { name: 'DEA', pattern: /\b[A-Z]{2}\d{7}\b/g, confidence: 0.8 },
    { name: 'NPI', pattern: /\b\d{10}\b(?=.*(?:npi|provider))/gi, confidence: 0.85 },
  ],
  [SensitiveDataType.PCI]: [
    { name: 'CREDIT_CARD', pattern: /\b(?:4\d{12}(?:\d{3})?|5[1-5]\d{14}|3[47]\d{13}|6(?:011|5\d{2})\d{12})\b/g, confidence: 0.95 },
    { name: 'CVV', pattern: /\bcvv[-:\s]?\d{3,4}\b/gi, confidence: 0.9 },
    { name: 'EXPIRY', pattern: /\b(?:0[1-9]|1[0-2])\/(?:\d{2}|\d{4})\b/g, confidence: 0.7 },
  ],
  [SensitiveDataType.CREDENTIALS]: [
    { name: 'API_KEY', pattern: /\b(?:api[_-]?key|apikey)[-:\s='"]*[A-Za-z0-9_-]{20,}\b/gi, confidence: 0.9 },
    { name: 'SECRET', pattern: /\b(?:secret|password|passwd|pwd)[-:\s='"]*[^\s'"]{8,}\b/gi, confidence: 0.85 },
    { name: 'TOKEN', pattern: /\b(?:bearer|token)[-:\s='"]*[A-Za-z0-9_.-]{20,}\b/gi, confidence: 0.85 },
    { name: 'AWS_KEY', pattern: /\bAKIA[0-9A-Z]{16}\b/g, confidence: 0.98 },
    { name: 'PRIVATE_KEY', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g, confidence: 0.99 },
  ],
  [SensitiveDataType.CLASSIFIED]: [
    { name: 'CLASSIFICATION', pattern: /\b(?:TOP SECRET|SECRET|CONFIDENTIAL|CLASSIFIED)\b(?:\/\/[A-Z]+)*/gi, confidence: 0.95 },
    { name: 'CAVEAT', pattern: /\b(?:NOFORN|ORCON|REL TO|EYES ONLY)\b/gi, confidence: 0.9 },
  ],
  [SensitiveDataType.LOCATION]: [
    { name: 'COORDINATES', pattern: /-?\d{1,3}\.\d{4,},\s*-?\d{1,3}\.\d{4,}/g, confidence: 0.85 },
    { name: 'MGRS', pattern: /\b\d{1,2}[A-Z]{3}\d{10}\b/g, confidence: 0.9 },
  ],
  [SensitiveDataType.BIOMETRIC]: [
    { name: 'FINGERPRINT', pattern: /\b(?:fingerprint|biometric)[-:\s]*[A-Fa-f0-9]{32,}\b/gi, confidence: 0.8 },
  ],
};

interface DetectionRule {
  name: string;
  pattern: RegExp;
  confidence: number;
}

interface DetectionContext {
  source: 'input' | 'code' | 'output';
  path?: string;
}

/**
 * SensitiveDataDetector automatically identifies and flags sensitive/regulated data
 * in code, inputs, and outputs to prevent data leakage.
 */
export class SensitiveDataDetector {
  private customPatterns: Map<string, DetectionRule> = new Map();

  /**
   * Scan input data for sensitive information
   */
  async scanInputs(inputs: Record<string, unknown>): Promise<SensitiveDataFlag[]> {
    return this.scanObject(inputs, { source: 'input', path: '' });
  }

  /**
   * Scan code for embedded sensitive data or dangerous patterns
   */
  async scanCode(code: string): Promise<SensitiveDataFlag[]> {
    const flags: SensitiveDataFlag[] = [];

    // Scan for sensitive data patterns
    const dataFlags = this.scanString(code, { source: 'code' });
    flags.push(...dataFlags);

    // Scan for dangerous code patterns
    const dangerousPatterns = [
      { pattern: /eval\s*\(/g, message: 'Dynamic code evaluation detected' },
      { pattern: /new\s+Function\s*\(/g, message: 'Dynamic function creation detected' },
      { pattern: /process\.env/g, message: 'Environment variable access detected' },
      { pattern: /require\s*\(\s*['"][^'"]*['"]\s*\)/g, message: 'Module import detected' },
      { pattern: /import\s+.*from/g, message: 'ES module import detected' },
      { pattern: /child_process|spawn|exec/g, message: 'Process execution detected' },
      { pattern: /fs\.|readFile|writeFile/g, message: 'Filesystem access detected' },
      { pattern: /http\.|https\.|fetch\s*\(/g, message: 'Network access detected' },
    ];

    for (const { pattern, message } of dangerousPatterns) {
      const matches = code.matchAll(pattern);
      for (const match of matches) {
        flags.push({
          type: SensitiveDataType.CREDENTIALS,
          location: `code:${this.getLineNumber(code, match.index!)}`,
          confidence: 0.7,
          redacted: match[0],
          recommendation: message,
        });
      }
    }

    return flags;
  }

  /**
   * Scan output data for sensitive information
   */
  async scanOutput(output: unknown): Promise<SensitiveDataFlag[]> {
    if (output === null || output === undefined) return [];
    return this.scanObject({ output }, { source: 'output', path: '' });
  }

  /**
   * Recursively scan an object for sensitive data
   */
  private scanObject(
    obj: unknown,
    context: DetectionContext,
    path = ''
  ): SensitiveDataFlag[] {
    const flags: SensitiveDataFlag[] = [];

    if (obj === null || obj === undefined) return flags;

    if (typeof obj === 'string') {
      return this.scanString(obj, { ...context, path });
    }

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        flags.push(...this.scanObject(item, context, `${path}[${index}]`));
      });
      return flags;
    }

    if (typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        const newPath = path ? `${path}.${key}` : key;

        // Check key names for sensitive field patterns
        if (this.isSensitiveFieldName(key)) {
          flags.push({
            type: SensitiveDataType.PII,
            location: `${context.source}:${newPath}`,
            confidence: 0.8,
            redacted: `[FIELD:${key}]`,
            recommendation: `Field name '${key}' suggests sensitive data`,
          });
        }

        flags.push(...this.scanObject(value, context, newPath));
      }
    }

    return flags;
  }

  /**
   * Scan a string for sensitive data patterns
   */
  private scanString(text: string, context: DetectionContext): SensitiveDataFlag[] {
    const flags: SensitiveDataFlag[] = [];

    for (const [type, rules] of Object.entries(DETECTION_PATTERNS)) {
      for (const rule of rules) {
        // Reset regex state
        rule.pattern.lastIndex = 0;
        const matches = text.matchAll(new RegExp(rule.pattern));

        for (const match of matches) {
          flags.push({
            type: type as SensitiveDataType,
            location: context.path
              ? `${context.source}:${context.path}`
              : `${context.source}:${this.getLineNumber(text, match.index!)}`,
            confidence: rule.confidence,
            redacted: this.redact(match[0], rule.name),
            recommendation: this.getRecommendation(type as SensitiveDataType, rule.name),
          });
        }
      }
    }

    // Check custom patterns
    for (const [name, rule] of this.customPatterns) {
      rule.pattern.lastIndex = 0;
      const matches = text.matchAll(new RegExp(rule.pattern));

      for (const match of matches) {
        flags.push({
          type: SensitiveDataType.PII,
          location: `${context.source}:custom:${name}`,
          confidence: rule.confidence,
          redacted: this.redact(match[0], name),
          recommendation: `Custom pattern '${name}' matched`,
        });
      }
    }

    return flags;
  }

  /**
   * Check if field name suggests sensitive data
   */
  private isSensitiveFieldName(name: string): boolean {
    const sensitiveNames = [
      'ssn', 'social_security', 'password', 'passwd', 'secret',
      'api_key', 'apikey', 'token', 'credit_card', 'card_number',
      'cvv', 'pin', 'dob', 'date_of_birth', 'birth_date',
      'phone', 'email', 'address', 'salary', 'income',
    ];
    return sensitiveNames.some(s => name.toLowerCase().includes(s));
  }

  /**
   * Redact sensitive data for logging
   */
  private redact(value: string, type: string): string {
    if (value.length <= 4) return '****';

    switch (type) {
      case 'SSN':
        return `***-**-${value.slice(-4)}`;
      case 'CREDIT_CARD':
        return `****-****-****-${value.slice(-4)}`;
      case 'EMAIL':
        const [local, domain] = value.split('@');
        return `${local[0]}***@${domain}`;
      case 'PHONE':
        return `***-***-${value.slice(-4)}`;
      default:
        return `${value.slice(0, 2)}${'*'.repeat(value.length - 4)}${value.slice(-2)}`;
    }
  }

  /**
   * Get recommendation for handling detected sensitive data
   */
  private getRecommendation(type: SensitiveDataType, ruleName: string): string {
    const recommendations: Record<SensitiveDataType, string> = {
      [SensitiveDataType.PII]: 'Remove or tokenize personally identifiable information before processing',
      [SensitiveDataType.PHI]: 'Healthcare data requires HIPAA-compliant handling and de-identification',
      [SensitiveDataType.PCI]: 'Payment card data must be handled per PCI-DSS requirements',
      [SensitiveDataType.CREDENTIALS]: 'Never embed credentials in code; use secure secret management',
      [SensitiveDataType.CLASSIFIED]: 'Classified information requires appropriate security controls',
      [SensitiveDataType.LOCATION]: 'Location data may require anonymization or aggregation',
      [SensitiveDataType.BIOMETRIC]: 'Biometric data requires special handling and consent',
    };

    return recommendations[type] || 'Review and sanitize sensitive data';
  }

  /**
   * Get line number from string index
   */
  private getLineNumber(text: string, index: number): number {
    return text.slice(0, index).split('\n').length;
  }

  /**
   * Add custom detection pattern
   */
  addCustomPattern(name: string, pattern: RegExp, confidence: number): void {
    this.customPatterns.set(name, { name, pattern, confidence });
    logger.info('Added custom detection pattern', { name });
  }

  /**
   * Remove custom detection pattern
   */
  removeCustomPattern(name: string): boolean {
    return this.customPatterns.delete(name);
  }

  /**
   * Get detection statistics
   */
  getPatternStats(): { type: string; ruleCount: number }[] {
    return Object.entries(DETECTION_PATTERNS).map(([type, rules]) => ({
      type,
      ruleCount: rules.length,
    }));
  }
}
