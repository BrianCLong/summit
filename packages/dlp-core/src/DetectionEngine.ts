/**
 * Detection Engine
 *
 * Core pattern detection engine for DLP content scanning.
 * Supports regex patterns, ML classification, and document fingerprinting.
 *
 * @package dlp-core
 */

import { createHash } from 'crypto';
import type {
  DetectionResult,
  DetectedPattern,
  PatternConfig,
  DetectionContext,
  DetectedDataType,
  DataClassification,
  DataCategory,
} from './types';

// Default pattern configurations
const DEFAULT_PATTERNS: PatternConfig[] = [
  {
    name: 'SSN',
    type: 'SSN',
    regex: '(?!000|666|9\\d{2})\\d{3}[-\\s]?(?!00)\\d{2}[-\\s]?(?!0000)\\d{4}',
    confidence: 0.95,
    contextBoost: ['social security', 'ssn', 'tax id', 'tin'],
    falsePositiveFilters: ['phone', 'date'],
  },
  {
    name: 'Credit Card',
    type: 'CREDIT_CARD',
    regex: '(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})',
    confidence: 0.98,
    validation: 'luhn',
  },
  {
    name: 'Email',
    type: 'EMAIL',
    regex: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
    confidence: 0.99,
  },
  {
    name: 'Phone',
    type: 'PHONE',
    regex: '(?:\\+?1[-\\.\\s]?)?\\(?[2-9]\\d{2}\\)?[-\\.\\s]?\\d{3}[-\\.\\s]?\\d{4}',
    confidence: 0.85,
    contextBoost: ['phone', 'call', 'mobile', 'cell', 'fax'],
  },
  {
    name: 'IP Address',
    type: 'IP_ADDRESS',
    regex: '(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)',
    confidence: 0.90,
  },
  {
    name: 'Date of Birth',
    type: 'DATE_OF_BIRTH',
    regex: '(?:0[1-9]|1[0-2])[/\\-](?:0[1-9]|[12][0-9]|3[01])[/\\-](?:19|20)\\d{2}',
    confidence: 0.75,
    contextBoost: ['dob', 'birth', 'birthday', 'born'],
  },
  {
    name: 'AWS Access Key',
    type: 'API_KEY',
    regex: 'AKIA[0-9A-Z]{16}',
    confidence: 0.99,
  },
  {
    name: 'OpenAI API Key',
    type: 'API_KEY',
    regex: 'sk-[a-zA-Z0-9]{32,}',
    confidence: 0.99,
  },
  {
    name: 'GitHub PAT',
    type: 'API_KEY',
    regex: 'ghp_[a-zA-Z0-9]{36}',
    confidence: 0.99,
  },
  {
    name: 'Slack Token',
    type: 'API_KEY',
    regex: 'xox[baprs]-[0-9a-zA-Z-]+',
    confidence: 0.99,
  },
  {
    name: 'Generic Secret',
    type: 'PASSWORD',
    regex: '(?:password|passwd|pwd|secret|token|api_key|apikey)\\s*[:=]\\s*["\']?[^\\s"\']{8,}',
    confidence: 0.80,
  },
  {
    name: 'Bank Account',
    type: 'BANK_ACCOUNT',
    regex: '\\b\\d{8,17}\\b',
    confidence: 0.60,
    contextBoost: ['account', 'routing', 'aba', 'swift', 'iban', 'bank'],
  },
  {
    name: 'Passport',
    type: 'PASSPORT',
    regex: '[A-Z]{1,2}[0-9]{6,9}',
    confidence: 0.70,
    contextBoost: ['passport', 'travel document'],
  },
  {
    name: 'Driver License',
    type: 'DRIVER_LICENSE',
    regex: '[A-Z]{1,2}[0-9]{5,8}',
    confidence: 0.65,
    contextBoost: ['license', 'driver', 'dl', 'dmv'],
  },
];

// Classification mapping
const CLASSIFICATION_MAP: Record<DetectedDataType, { level: DataClassification; categories: DataCategory[] }> = {
  SSN: { level: 'RESTRICTED', categories: ['PII'] },
  CREDIT_CARD: { level: 'RESTRICTED', categories: ['PCI', 'FINANCIAL'] },
  BANK_ACCOUNT: { level: 'CONFIDENTIAL', categories: ['FINANCIAL'] },
  EMAIL: { level: 'INTERNAL', categories: ['PII'] },
  PHONE: { level: 'INTERNAL', categories: ['PII'] },
  DATE_OF_BIRTH: { level: 'CONFIDENTIAL', categories: ['PII'] },
  ADDRESS: { level: 'CONFIDENTIAL', categories: ['PII'] },
  IP_ADDRESS: { level: 'INTERNAL', categories: ['PII'] },
  PASSPORT: { level: 'RESTRICTED', categories: ['PII'] },
  DRIVER_LICENSE: { level: 'CONFIDENTIAL', categories: ['PII'] },
  API_KEY: { level: 'RESTRICTED', categories: ['TRADE_SECRET'] },
  PASSWORD: { level: 'RESTRICTED', categories: ['TRADE_SECRET'] },
  PHI: { level: 'RESTRICTED', categories: ['PHI', 'PII'] },
  BIOMETRIC: { level: 'RESTRICTED', categories: ['PII'] },
  FINANCIAL_DATA: { level: 'CONFIDENTIAL', categories: ['FINANCIAL'] },
  TRADE_SECRET: { level: 'RESTRICTED', categories: ['TRADE_SECRET'] },
  CUSTOM: { level: 'INTERNAL', categories: [] },
};

// Risk scores by data type
const RISK_SCORES: Record<DetectedDataType, number> = {
  SSN: 95,
  CREDIT_CARD: 95,
  BANK_ACCOUNT: 90,
  PASSPORT: 90,
  API_KEY: 95,
  PASSWORD: 95,
  PHI: 90,
  BIOMETRIC: 90,
  DRIVER_LICENSE: 80,
  DATE_OF_BIRTH: 60,
  ADDRESS: 50,
  EMAIL: 40,
  PHONE: 40,
  IP_ADDRESS: 30,
  FINANCIAL_DATA: 70,
  TRADE_SECRET: 85,
  CUSTOM: 50,
};

export interface DetectionEngineConfig {
  patterns?: PatternConfig[];
  enableMlClassification?: boolean;
  enableFingerprinting?: boolean;
  maxDetections?: number;
  contextWindow?: number;
}

export class DetectionEngine {
  private patterns: PatternConfig[];
  private compiledPatterns: Map<string, RegExp>;
  private config: DetectionEngineConfig;

  constructor(config: DetectionEngineConfig = {}) {
    this.config = {
      maxDetections: 1000,
      contextWindow: 50,
      ...config,
    };
    this.patterns = [...DEFAULT_PATTERNS, ...(config.patterns || [])];
    this.compiledPatterns = new Map();
    this.compilePatterns();
  }

  private compilePatterns(): void {
    for (const pattern of this.patterns) {
      try {
        this.compiledPatterns.set(pattern.name, new RegExp(pattern.regex, 'gi'));
      } catch (error) {
        console.error(`Failed to compile pattern ${pattern.name}:`, error);
      }
    }
  }

  /**
   * Detect sensitive data patterns in content
   */
  async detect(content: string, context?: DetectionContext): Promise<DetectionResult> {
    const startTime = Date.now();
    const detections: DetectedPattern[] = [];
    const categoriesSet = new Set<DataCategory>();
    let maxClassification: DataClassification = 'PUBLIC';
    let maxRiskScore = 0;

    // Run pattern detection
    for (const pattern of this.patterns) {
      const regex = this.compiledPatterns.get(pattern.name);
      if (!regex) continue;

      let match;
      regex.lastIndex = 0; // Reset regex state

      while ((match = regex.exec(content)) !== null) {
        if (detections.length >= (this.config.maxDetections || 1000)) break;

        const matchedValue = match[0];
        let confidence = pattern.confidence;

        // Boost confidence if context keywords are nearby
        if (pattern.contextBoost) {
          const contextStart = Math.max(0, match.index - (this.config.contextWindow || 50));
          const contextEnd = Math.min(
            content.length,
            match.index + matchedValue.length + (this.config.contextWindow || 50)
          );
          const surroundingContext = content.slice(contextStart, contextEnd).toLowerCase();

          for (const keyword of pattern.contextBoost) {
            if (surroundingContext.includes(keyword.toLowerCase())) {
              confidence = Math.min(1, confidence + 0.05);
            }
          }
        }

        // Apply validation if specified
        if (pattern.validation === 'luhn' && !this.luhnCheck(matchedValue)) {
          continue; // Skip invalid credit card numbers
        }

        // Check for false positives
        if (pattern.falsePositiveFilters) {
          let isFalsePositive = false;
          for (const filter of pattern.falsePositiveFilters) {
            if (this.checkFalsePositive(matchedValue, filter)) {
              isFalsePositive = true;
              break;
            }
          }
          if (isFalsePositive) continue;
        }

        const detection: DetectedPattern = {
          type: pattern.type,
          pattern: pattern.name,
          confidence,
          location: {
            start: match.index,
            end: match.index + matchedValue.length,
          },
          matchedValue,
          context: this.extractContext(content, match.index, matchedValue.length),
        };

        detections.push(detection);

        // Update classification
        const classificationInfo = CLASSIFICATION_MAP[pattern.type];
        if (classificationInfo) {
          if (this.compareClassification(classificationInfo.level, maxClassification) > 0) {
            maxClassification = classificationInfo.level;
          }
          classificationInfo.categories.forEach((cat) => categoriesSet.add(cat));
        }

        // Update risk score
        const riskScore = RISK_SCORES[pattern.type] || 50;
        maxRiskScore = Math.max(maxRiskScore, riskScore);
      }
    }

    return {
      hasDetections: detections.length > 0,
      detections,
      riskScore: maxRiskScore,
      classification: maxClassification,
      categories: Array.from(categoriesSet),
      processingTime: Date.now() - startTime,
    };
  }

  /**
   * Luhn algorithm for credit card validation
   */
  private luhnCheck(cardNumber: string): boolean {
    const digits = cardNumber.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) return false;

    let sum = 0;
    let isEven = false;

    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i], 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  /**
   * Check for false positive patterns
   */
  private checkFalsePositive(value: string, filterType: string): boolean {
    switch (filterType) {
      case 'phone':
        // SSN false positive: might be a phone number
        return /^\d{3}[-\s]?\d{3}[-\s]?\d{4}$/.test(value);
      case 'date':
        // SSN false positive: might be a date
        return /^\d{2}[-/]\d{2}[-/]\d{4}$/.test(value);
      default:
        return false;
    }
  }

  /**
   * Extract surrounding context for a match
   */
  private extractContext(content: string, start: number, length: number): string {
    const contextWindow = this.config.contextWindow || 50;
    const contextStart = Math.max(0, start - contextWindow);
    const contextEnd = Math.min(content.length, start + length + contextWindow);
    return content.slice(contextStart, contextEnd);
  }

  /**
   * Compare classification levels
   */
  private compareClassification(a: DataClassification, b: DataClassification): number {
    const levels: DataClassification[] = ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED', 'TOP_SECRET'];
    return levels.indexOf(a) - levels.indexOf(b);
  }

  /**
   * Add custom pattern
   */
  addPattern(pattern: PatternConfig): void {
    this.patterns.push(pattern);
    try {
      this.compiledPatterns.set(pattern.name, new RegExp(pattern.regex, 'gi'));
    } catch (error) {
      console.error(`Failed to compile pattern ${pattern.name}:`, error);
    }
  }

  /**
   * Generate content fingerprint for document matching
   */
  generateFingerprint(content: string): string {
    // Normalize content
    const normalized = content
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .trim();

    // Generate hash
    return createHash('sha256').update(normalized).digest('hex');
  }
}

export default DetectionEngine;
