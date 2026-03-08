/**
 * Validation utilities for threat detection
 */

import { z } from 'zod';
import { ThreatEvent, ThreatSeverity, ThreatCategory, EventSource } from '../types/events';

/**
 * Zod schema for ThreatEvent validation
 */
export const ThreatEventSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.date(),
  source: z.nativeEnum(EventSource),
  category: z.nativeEnum(ThreatCategory),
  severity: z.nativeEnum(ThreatSeverity),

  userId: z.string().optional(),
  entityId: z.string().optional(),
  sourceIp: z.string().ip().optional(),
  destinationIp: z.string().ip().optional(),

  threatScore: z.number().min(0).max(1),
  confidenceScore: z.number().min(0).max(1),
  indicators: z.array(z.string()),

  description: z.string().min(1),
  rawData: z.record(z.any()),
  metadata: z.record(z.any()),

  mitreAttackTactics: z.array(z.string()).optional(),
  mitreAttackTechniques: z.array(z.string()).optional(),

  correlationId: z.string().optional(),
  relatedEvents: z.array(z.string()).optional(),

  responded: z.boolean(),
  responseActions: z.array(z.string()).optional()
});

/**
 * Validate threat event
 */
export function validateThreatEvent(event: unknown): {
  valid: boolean;
  event?: ThreatEvent;
  errors?: z.ZodError;
} {
  try {
    const validated = ThreatEventSchema.parse(event);
    return { valid: true, event: validated as ThreatEvent };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, errors: error };
    }
    throw error;
  }
}

/**
 * Validate IP address
 */
export function isValidIp(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

  if (ipv4Regex.test(ip)) {
    const parts = ip.split('.');
    return parts.every(part => parseInt(part, 10) <= 255);
  }

  return ipv6Regex.test(ip);
}

/**
 * Validate domain name
 */
export function isValidDomain(domain: string): boolean {
  const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  return domainRegex.test(domain);
}

/**
 * Validate URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate hash (MD5, SHA1, SHA256, SHA512)
 */
export function isValidHash(hash: string, type?: 'md5' | 'sha1' | 'sha256' | 'sha512'): boolean {
  const patterns = {
    md5: /^[a-fA-F0-9]{32}$/,
    sha1: /^[a-fA-F0-9]{40}$/,
    sha256: /^[a-fA-F0-9]{64}$/,
    sha512: /^[a-fA-F0-9]{128}$/
  };

  if (type) {
    return patterns[type].test(hash);
  }

  // Try all patterns if type not specified
  return Object.values(patterns).some(pattern => pattern.test(hash));
}

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate MITRE ATT&CK technique ID
 */
export function isValidMitreTechnique(techniqueId: string): boolean {
  // Format: T1234 or T1234.001
  const techniqueRegex = /^T\d{4}(\.\d{3})?$/;
  return techniqueRegex.test(techniqueId);
}

/**
 * Sanitize user input to prevent injection attacks
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/['"]/g, '') // Remove quotes
    .replace(/[\\]/g, '') // Remove backslashes
    .trim();
}

/**
 * Validate and sanitize SQL input (basic protection)
 */
export function sanitizeSqlInput(input: string): string {
  const dangerous = [
    'DROP', 'DELETE', 'UPDATE', 'INSERT', 'EXEC', 'EXECUTE',
    'CREATE', 'ALTER', 'GRANT', 'REVOKE', '--', ';', 'xp_'
  ];

  let sanitized = input.trim();

  for (const keyword of dangerous) {
    const regex = new RegExp(keyword, 'gi');
    if (regex.test(sanitized)) {
      throw new Error(`Potentially dangerous SQL keyword detected: ${keyword}`);
    }
  }

  return sanitized;
}

/**
 * Validate JSON data
 */
export function isValidJson(data: string): boolean {
  try {
    JSON.parse(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate time range
 */
export function isValidTimeRange(start: Date, end: Date, maxRange?: number): {
  valid: boolean;
  error?: string;
} {
  if (start > end) {
    return { valid: false, error: 'Start time must be before end time' };
  }

  if (start > new Date()) {
    return { valid: false, error: 'Start time cannot be in the future' };
  }

  if (maxRange) {
    const range = end.getTime() - start.getTime();
    if (range > maxRange) {
      return { valid: false, error: `Time range exceeds maximum of ${maxRange}ms` };
    }
  }

  return { valid: true };
}

/**
 * Validate threat score range
 */
export function isValidThreatScore(score: number): boolean {
  return score >= 0 && score <= 1 && !isNaN(score);
}

/**
 * Validate indicator type and value
 */
export function validateIndicator(type: string, value: string): {
  valid: boolean;
  error?: string;
} {
  switch (type) {
    case 'ip':
      if (!isValidIp(value)) {
        return { valid: false, error: 'Invalid IP address format' };
      }
      break;

    case 'domain':
      if (!isValidDomain(value)) {
        return { valid: false, error: 'Invalid domain format' };
      }
      break;

    case 'url':
      if (!isValidUrl(value)) {
        return { valid: false, error: 'Invalid URL format' };
      }
      break;

    case 'hash':
      if (!isValidHash(value)) {
        return { valid: false, error: 'Invalid hash format' };
      }
      break;

    case 'email':
      if (!isValidEmail(value)) {
        return { valid: false, error: 'Invalid email format' };
      }
      break;

    default:
      return { valid: false, error: `Unknown indicator type: ${type}` };
  }

  return { valid: true };
}

/**
 * Rate limiting validator
 */
export class RateLimitValidator {
  private counts = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  validate(key: string): {
    allowed: boolean;
    remaining: number;
    resetAt: number;
  } {
    const now = Date.now();
    const record = this.counts.get(key);

    if (!record || now >= record.resetAt) {
      // New window
      this.counts.set(key, {
        count: 1,
        resetAt: now + this.windowMs
      });

      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetAt: now + this.windowMs
      };
    }

    if (record.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: record.resetAt
      };
    }

    record.count++;

    return {
      allowed: true,
      remaining: this.maxRequests - record.count,
      resetAt: record.resetAt
    };
  }

  reset(key: string): void {
    this.counts.delete(key);
  }

  clear(): void {
    this.counts.clear();
  }
}
