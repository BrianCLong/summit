// @ts-nocheck
/**
 * PII Detector Service
 *
 * Detects and classifies Personally Identifiable Information in data.
 *
 * SOC 2 Controls: CC6.1 (Logical Access), P1.1 (Privacy)
 *
 * @module privacy/PIIDetector
 */

import { GovernanceResult } from '../types/data-envelope.js';
import type { DataEnvelope, GovernanceVerdict } from '../types/data-envelope.js';
import logger from '../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

export type PIICategory =
  | 'email'
  | 'phone'
  | 'ssn'
  | 'credit_card'
  | 'ip_address'
  | 'date_of_birth'
  | 'address'
  | 'name'
  | 'passport'
  | 'driver_license'
  | 'bank_account'
  | 'health_info'
  | 'biometric'
  | 'location'
  | 'custom';

export type PIISensitivity = 'low' | 'medium' | 'high' | 'critical';

export interface PIIDetection {
  category: PIICategory;
  sensitivity: PIISensitivity;
  field?: string;
  path?: string;
  value?: string; // Masked value
  confidence: number;
  location: {
    start?: number;
    end?: number;
  };
  recommendation: string;
}

export interface PIIScanResult {
  hasPI: boolean;
  detections: PIIDetection[];
  riskScore: number;
  recommendations: string[];
  scannedAt: string;
  scanDuration: number;
}

export interface PIIPattern {
  category: PIICategory;
  sensitivity: PIISensitivity;
  pattern: RegExp;
  validator?: (value: string) => boolean;
  maskFn: (value: string) => string;
  recommendation: string;
}

// ============================================================================
// PII Patterns
// ============================================================================

const PII_PATTERNS: PIIPattern[] = [
  {
    category: 'email',
    sensitivity: 'medium',
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    maskFn: (v) => v.replace(/(.{2}).*@/, '$1***@'),
    recommendation: 'Consider encrypting or hashing email addresses',
  },
  {
    category: 'phone',
    sensitivity: 'medium',
    pattern: /(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g,
    maskFn: (v) => v.replace(/\d(?=\d{4})/g, '*'),
    recommendation: 'Consider masking or encrypting phone numbers',
  },
  {
    category: 'ssn',
    sensitivity: 'critical',
    pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
    validator: (v) => {
      const clean = v.replace(/[-\s]/g, '');
      return clean.length === 9 && !/^0{3}|^666|^9/.test(clean);
    },
    maskFn: () => '***-**-****',
    recommendation: 'SSN must be encrypted and access logged. Consider tokenization.',
  },
  {
    category: 'credit_card',
    sensitivity: 'critical',
    pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    validator: (v) => {
      const clean = v.replace(/[-\s]/g, '');
      // Luhn algorithm check
      let sum = 0;
      let isEven = false;
      for (let i = clean.length - 1; i >= 0; i--) {
        let digit = parseInt(clean[i], 10);
        if (isEven) {
          digit *= 2;
          if (digit > 9) digit -= 9;
        }
        sum += digit;
        isEven = !isEven;
      }
      return sum % 10 === 0;
    },
    maskFn: (v) => v.replace(/\d(?=\d{4})/g, '*'),
    recommendation: 'Credit card numbers must use PCI-DSS compliant tokenization',
  },
  {
    category: 'ip_address',
    sensitivity: 'low',
    pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    validator: (v) => {
      const parts = v.split('.');
      return parts.every((p) => parseInt(p, 10) <= 255);
    },
    maskFn: (v) => v.replace(/\.\d+$/, '.xxx'),
    recommendation: 'Consider anonymizing IP addresses for analytics',
  },
  {
    category: 'date_of_birth',
    sensitivity: 'medium',
    pattern: /\b(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])[\/\-](19|20)\d{2}\b/g,
    maskFn: () => 'XX/XX/XXXX',
    recommendation: 'Date of birth should be age-gated or generalized',
  },
  {
    category: 'passport',
    sensitivity: 'critical',
    pattern: /\b[A-Z]{1,2}\d{6,9}\b/g,
    maskFn: (v) => v.substring(0, 2) + '*'.repeat(v.length - 2),
    recommendation: 'Passport numbers must be encrypted with strict access controls',
  },
  {
    category: 'bank_account',
    sensitivity: 'critical',
    pattern: /\b\d{8,17}\b/g,
    maskFn: (v) => '*'.repeat(v.length - 4) + v.slice(-4),
    recommendation: 'Bank account numbers must be encrypted and tokenized',
  },
  {
    category: 'name',
    sensitivity: 'medium',
    // Basic name pattern - in production, use NER
    pattern: /\b([A-Z][a-z]+\s){1,2}[A-Z][a-z]+\b/g,
    maskFn: (v) => v.split(' ').map((n) => n[0] + '***').join(' '),
    recommendation: 'Consider pseudonymization for personal names',
  },
];

// ============================================================================
// PII Detector Implementation
// ============================================================================

export class PIIDetector {
  private patterns: PIIPattern[] = PII_PATTERNS;
  private customPatterns: PIIPattern[] = [];

  constructor() {
    logger.info('PII detector initialized');
  }

  // --------------------------------------------------------------------------
  // Scanning
  // --------------------------------------------------------------------------

  async scanText(
    text: string,
    options?: { includeValue?: boolean }
  ): Promise<DataEnvelope<PIIScanResult>> {
    const startTime = Date.now();
    const detections: PIIDetection[] = [];

    const allPatterns = [...this.patterns, ...this.customPatterns];

    for (const pattern of allPatterns) {
      const matches = text.matchAll(pattern.pattern);

      for (const match of matches) {
        const value = match[0];

        // Validate if validator exists
        if (pattern.validator && !pattern.validator(value)) {
          continue;
        }

        const detection: PIIDetection = {
          category: pattern.category,
          sensitivity: pattern.sensitivity,
          value: options?.includeValue ? pattern.maskFn(value) : undefined,
          confidence: pattern.validator ? 0.95 : 0.8,
          location: {
            start: match.index,
            end: match.index ? match.index + value.length : undefined,
          },
          recommendation: pattern.recommendation,
        };

        detections.push(detection);
      }
    }

    const result = this.buildScanResult(detections, startTime);

    logger.info(
      { hasPI: result.hasPI, detectionCount: result.detections.length },
      'PII scan completed'
    );

    return {
      data: result,
      provenance: {
        sources: [{ id: 'pii-detector', type: 'system' }],
        confidence: 1.0,
      },
      governance: {
        verdict: result.hasPI ? GovernanceResult.FLAG : GovernanceResult.ALLOW,
        evaluatedPolicies: [],
        enforcedAt: new Date().toISOString(),
      },
      meta: {
        generatedAt: new Date().toISOString(),
      },
    };
  }

  async scanObject(
    obj: Record<string, unknown>,
    options?: { includeValue?: boolean; maxDepth?: number }
  ): Promise<DataEnvelope<PIIScanResult>> {
    const startTime = Date.now();
    const detections: PIIDetection[] = [];
    const maxDepth = options?.maxDepth ?? 10;

    this.scanObjectRecursive(obj, detections, '', 0, maxDepth, options?.includeValue);

    const result = this.buildScanResult(detections, startTime);

    logger.info(
      { hasPI: result.hasPI, detectionCount: result.detections.length },
      'PII object scan completed'
    );

    return {
      data: result,
      provenance: {
        sources: [{ id: 'pii-detector', type: 'system' }],
        confidence: 1.0,
      },
      governance: {
        verdict: result.hasPI ? GovernanceResult.FLAG : GovernanceResult.ALLOW,
        evaluatedPolicies: [],
        enforcedAt: new Date().toISOString(),
      },
      meta: {
        generatedAt: new Date().toISOString(),
      },
    };
  }

  private scanObjectRecursive(
    obj: unknown,
    detections: PIIDetection[],
    path: string,
    depth: number,
    maxDepth: number,
    includeValue?: boolean
  ): void {
    if (depth > maxDepth) return;

    if (typeof obj === 'string') {
      this.scanStringValue(obj, path, detections, includeValue);
    } else if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        this.scanObjectRecursive(
          item,
          detections,
          `${path}[${index}]`,
          depth + 1,
          maxDepth,
          includeValue
        );
      });
    } else if (obj && typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        const newPath = path ? `${path}.${key}` : key;

        // Check field name for PII indicators
        this.checkFieldName(key, newPath, detections);

        this.scanObjectRecursive(value, detections, newPath, depth + 1, maxDepth, includeValue);
      }
    }
  }

  private scanStringValue(
    value: string,
    path: string,
    detections: PIIDetection[],
    includeValue?: boolean
  ): void {
    const allPatterns = [...this.patterns, ...this.customPatterns];

    for (const pattern of allPatterns) {
      const matches = value.matchAll(pattern.pattern);

      for (const match of matches) {
        const matchValue = match[0];

        if (pattern.validator && !pattern.validator(matchValue)) {
          continue;
        }

        detections.push({
          category: pattern.category,
          sensitivity: pattern.sensitivity,
          field: path.split('.').pop(),
          path,
          value: includeValue ? pattern.maskFn(matchValue) : undefined,
          confidence: pattern.validator ? 0.95 : 0.8,
          location: {
            start: match.index,
            end: match.index ? match.index + matchValue.length : undefined,
          },
          recommendation: pattern.recommendation,
        });
      }
    }
  }

  private checkFieldName(fieldName: string, path: string, detections: PIIDetection[]): void {
    const piiFieldPatterns: Record<string, { category: PIICategory; sensitivity: PIISensitivity }> = {
      email: { category: 'email', sensitivity: 'medium' },
      mail: { category: 'email', sensitivity: 'medium' },
      phone: { category: 'phone', sensitivity: 'medium' },
      mobile: { category: 'phone', sensitivity: 'medium' },
      ssn: { category: 'ssn', sensitivity: 'critical' },
      social_security: { category: 'ssn', sensitivity: 'critical' },
      credit_card: { category: 'credit_card', sensitivity: 'critical' },
      card_number: { category: 'credit_card', sensitivity: 'critical' },
      dob: { category: 'date_of_birth', sensitivity: 'medium' },
      date_of_birth: { category: 'date_of_birth', sensitivity: 'medium' },
      birthday: { category: 'date_of_birth', sensitivity: 'medium' },
      passport: { category: 'passport', sensitivity: 'critical' },
      license: { category: 'driver_license', sensitivity: 'high' },
      address: { category: 'address', sensitivity: 'medium' },
      street: { category: 'address', sensitivity: 'medium' },
      first_name: { category: 'name', sensitivity: 'medium' },
      last_name: { category: 'name', sensitivity: 'medium' },
      full_name: { category: 'name', sensitivity: 'medium' },
    };

    const lowerField = fieldName.toLowerCase();
    for (const [pattern, info] of Object.entries(piiFieldPatterns)) {
      if (lowerField.includes(pattern)) {
        detections.push({
          category: info.category,
          sensitivity: info.sensitivity,
          field: fieldName,
          path,
          confidence: 0.7, // Lower confidence for field name match
          location: {},
          recommendation: `Field "${fieldName}" may contain PII (${info.category})`,
        });
      }
    }
  }

  // --------------------------------------------------------------------------
  // Pattern Management
  // --------------------------------------------------------------------------

  addCustomPattern(pattern: PIIPattern): void {
    this.customPatterns.push(pattern);
    logger.info({ category: pattern.category }, 'Custom PII pattern added');
  }

  getPatternCategories(): PIICategory[] {
    const allPatterns = [...this.patterns, ...this.customPatterns];
    return [...new Set(allPatterns.map((p) => p.category))];
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private buildScanResult(detections: PIIDetection[], startTime: number): PIIScanResult {
    // Calculate risk score based on detections
    const sensitivityScores: Record<PIISensitivity, number> = {
      low: 10,
      medium: 30,
      high: 60,
      critical: 100,
    };

    let riskScore = 0;
    for (const detection of detections) {
      riskScore += sensitivityScores[detection.sensitivity] * detection.confidence;
    }

    // Normalize to 0-100
    riskScore = Math.min(100, riskScore);

    // Generate recommendations
    const recommendations = [...new Set(detections.map((d) => d.recommendation))];

    return {
      hasPI: detections.length > 0,
      detections,
      riskScore,
      recommendations,
      scannedAt: new Date().toISOString(),
      scanDuration: Date.now() - startTime,
    };
  }

  // --------------------------------------------------------------------------
  // Masking Helpers
  // --------------------------------------------------------------------------

  maskValue(value: string, category: PIICategory): string {
    const pattern = [...this.patterns, ...this.customPatterns].find((p) => p.category === category);
    if (pattern) {
      return pattern.maskFn(value);
    }
    // Default masking
    return '*'.repeat(value.length);
  }
}

// Export singleton
export const piiDetector = new PIIDetector();
export default PIIDetector;
