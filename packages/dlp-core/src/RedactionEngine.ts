/**
 * Redaction Engine
 *
 * Applies data masking and redaction strategies to sensitive content.
 *
 * @package dlp-core
 */

import { createHash, randomBytes } from 'crypto';
import type {
  RedactionRequest,
  RedactionResult,
  RedactionConfig,
  RedactionStrategy,
  DetectedPattern,
  DetectedDataType,
} from './types';

// Default redaction configurations by data type
const DEFAULT_REDACTION_CONFIGS: Record<DetectedDataType, RedactionConfig> = {
  SSN: {
    strategy: 'FULL_MASK',
    maskChar: 'X',
    preserveFormat: true,
  },
  CREDIT_CARD: {
    strategy: 'PARTIAL_MASK',
    maskChar: '*',
    preserveLast: 4,
  },
  BANK_ACCOUNT: {
    strategy: 'PARTIAL_MASK',
    maskChar: '*',
    preserveLast: 4,
  },
  EMAIL: {
    strategy: 'PARTIAL_MASK',
    maskChar: '*',
    preserveDomain: true,
  },
  PHONE: {
    strategy: 'PARTIAL_MASK',
    maskChar: '*',
    preserveAreaCode: true,
  },
  DATE_OF_BIRTH: {
    strategy: 'GENERALIZE',
    maskChar: '*',
  },
  ADDRESS: {
    strategy: 'PARTIAL_MASK',
    maskChar: '*',
    preserveLast: 15, // Keep city/state
  },
  IP_ADDRESS: {
    strategy: 'PARTIAL_MASK',
    maskChar: '*',
    preserveFirst: 7, // Keep first two octets
  },
  PASSPORT: {
    strategy: 'FULL_MASK',
    maskChar: 'X',
  },
  DRIVER_LICENSE: {
    strategy: 'PARTIAL_MASK',
    maskChar: '*',
    preserveFirst: 3, // Keep state prefix
  },
  API_KEY: {
    strategy: 'PARTIAL_MASK',
    maskChar: '*',
    preserveFirst: 4,
  },
  PASSWORD: {
    strategy: 'FULL_MASK',
    maskChar: '*',
  },
  PHI: {
    strategy: 'FULL_MASK',
    maskChar: '[REDACTED]',
  },
  BIOMETRIC: {
    strategy: 'REMOVE',
  },
  FINANCIAL_DATA: {
    strategy: 'PARTIAL_MASK',
    maskChar: '*',
    preserveLast: 4,
  },
  TRADE_SECRET: {
    strategy: 'FULL_MASK',
    maskChar: '[CONFIDENTIAL]',
  },
  CUSTOM: {
    strategy: 'FULL_MASK',
    maskChar: '*',
  },
};

export interface RedactionEngineConfig {
  defaultMaskChar?: string;
  deterministicMode?: boolean;
  tokenPrefix?: string;
  encryptionKey?: string;
}

export class RedactionEngine {
  private config: RedactionEngineConfig;
  private tokenMap: Map<string, string>;
  private reverseTokenMap: Map<string, string>;

  constructor(config: RedactionEngineConfig = {}) {
    this.config = {
      defaultMaskChar: '*',
      deterministicMode: false,
      tokenPrefix: 'TKN',
      ...config,
    };
    this.tokenMap = new Map();
    this.reverseTokenMap = new Map();
  }

  /**
   * Redact sensitive data from content
   */
  redact(request: RedactionRequest): RedactionResult {
    const { content, detections, configs = {}, options = {} } = request;

    // Sort detections by position (descending) to handle replacements correctly
    const sortedDetections = [...detections].sort((a, b) => b.location.start - a.location.start);

    let redactedContent = content;
    const redactedFields: RedactionResult['redactedFields'] = [];

    for (const detection of sortedDetections) {
      const config = configs[detection.type] || DEFAULT_REDACTION_CONFIGS[detection.type];
      if (!config) continue;

      const originalValue = detection.matchedValue;
      const redactedValue = this.applyRedaction(originalValue, detection.type, config);

      // Replace in content
      const before = redactedContent.slice(0, detection.location.start);
      const after = redactedContent.slice(detection.location.end);
      redactedContent = before + redactedValue + after;

      redactedFields.push({
        type: detection.type,
        originalLocation: { ...detection.location },
        strategy: config.strategy,
      });
    }

    return {
      redactedContent,
      redactedFields,
      tokenMap: this.config.deterministicMode ? new Map(this.tokenMap) : undefined,
    };
  }

  /**
   * Apply redaction to a single value
   */
  private applyRedaction(value: string, type: DetectedDataType, config: RedactionConfig): string {
    switch (config.strategy) {
      case 'FULL_MASK':
        return this.fullMask(value, config);
      case 'PARTIAL_MASK':
        return this.partialMask(value, type, config);
      case 'GENERALIZE':
        return this.generalize(value, type, config);
      case 'TOKENIZE':
        return this.tokenize(value, config);
      case 'ENCRYPT':
        return this.encrypt(value);
      case 'REMOVE':
        return '';
      default:
        return this.fullMask(value, config);
    }
  }

  /**
   * Full mask - replace entire value with mask characters
   */
  private fullMask(value: string, config: RedactionConfig): string {
    const maskChar = config.maskChar || this.config.defaultMaskChar || '*';

    // Check if maskChar is a word (like [REDACTED])
    if (maskChar.length > 1) {
      return maskChar;
    }

    if (config.preserveFormat) {
      return value.replace(/[a-zA-Z0-9]/g, maskChar);
    }

    return maskChar.repeat(value.length);
  }

  /**
   * Partial mask - preserve some characters
   */
  private partialMask(value: string, type: DetectedDataType, config: RedactionConfig): string {
    const maskChar = config.maskChar || this.config.defaultMaskChar || '*';

    // Handle email specially
    if (type === 'EMAIL' && config.preserveDomain) {
      const atIndex = value.indexOf('@');
      if (atIndex > 0) {
        const localPart = value.slice(0, atIndex);
        const domain = value.slice(atIndex);
        const maskedLocal = localPart[0] + maskChar.repeat(Math.max(0, localPart.length - 1));
        return maskedLocal + domain;
      }
    }

    // Handle phone specially
    if (type === 'PHONE' && config.preserveAreaCode) {
      const digits = value.replace(/\D/g, '');
      if (digits.length >= 10) {
        const areaCode = digits.slice(0, 3);
        const masked = maskChar.repeat(7);
        // Try to preserve format
        if (value.includes('(')) {
          return `(${areaCode}) ${maskChar.repeat(3)}-${maskChar.repeat(4)}`;
        }
        return `${areaCode}-${maskChar.repeat(3)}-${maskChar.repeat(4)}`;
      }
    }

    // Handle credit card
    if (type === 'CREDIT_CARD' && config.preserveLast) {
      const digits = value.replace(/\D/g, '');
      const lastN = config.preserveLast;
      const masked = maskChar.repeat(digits.length - lastN) + digits.slice(-lastN);
      // Format as XXXX-XXXX-XXXX-1234
      return masked.replace(/(.{4})/g, '$1-').slice(0, -1);
    }

    // Generic partial mask
    if (config.preserveFirst && config.preserveFirst > 0) {
      const preserved = value.slice(0, config.preserveFirst);
      const masked = maskChar.repeat(Math.max(0, value.length - config.preserveFirst));
      return preserved + masked;
    }

    if (config.preserveLast && config.preserveLast > 0) {
      const masked = maskChar.repeat(Math.max(0, value.length - config.preserveLast));
      const preserved = value.slice(-config.preserveLast);
      return masked + preserved;
    }

    return this.fullMask(value, config);
  }

  /**
   * Generalize - reduce precision of data
   */
  private generalize(value: string, type: DetectedDataType, config: RedactionConfig): string {
    const maskChar = config.maskChar || '*';

    if (type === 'DATE_OF_BIRTH') {
      // Keep only year
      const match = value.match(/(\d{4})$/);
      if (match) {
        return `${maskChar.repeat(2)}/${maskChar.repeat(2)}/${match[1]}`;
      }
    }

    if (type === 'ADDRESS') {
      // Keep only city/state/zip pattern
      const parts = value.split(',');
      if (parts.length >= 2) {
        return `[REDACTED], ${parts.slice(-2).join(',').trim()}`;
      }
    }

    if (type === 'IP_ADDRESS') {
      // Keep only first two octets
      const octets = value.split('.');
      if (octets.length === 4) {
        return `${octets[0]}.${octets[1]}.*.*`;
      }
    }

    return this.fullMask(value, config);
  }

  /**
   * Tokenize - replace with reversible token
   */
  private tokenize(value: string, config: RedactionConfig): string {
    const prefix = config.tokenPrefix || this.config.tokenPrefix || 'TKN';

    // Check if already tokenized
    if (this.tokenMap.has(value)) {
      return this.tokenMap.get(value)!;
    }

    // Generate token
    let token: string;
    if (this.config.deterministicMode) {
      // Deterministic token based on hash
      const hash = createHash('sha256').update(value).digest('hex').slice(0, 12);
      token = `${prefix}_${hash}`;
    } else {
      // Random token
      token = `${prefix}_${randomBytes(6).toString('hex')}`;
    }

    this.tokenMap.set(value, token);
    this.reverseTokenMap.set(token, value);

    return token;
  }

  /**
   * Encrypt - encrypt the value (placeholder)
   */
  private encrypt(value: string): string {
    // In production, use proper encryption with the configured key
    const hash = createHash('sha256').update(value).digest('base64').slice(0, 24);
    return `ENC:${hash}`;
  }

  /**
   * Detokenize - reverse tokenization
   */
  detokenize(token: string): string | null {
    return this.reverseTokenMap.get(token) || null;
  }

  /**
   * Clear token maps
   */
  clearTokens(): void {
    this.tokenMap.clear();
    this.reverseTokenMap.clear();
  }

  /**
   * Get token count
   */
  getTokenCount(): number {
    return this.tokenMap.size;
  }
}

export default RedactionEngine;
