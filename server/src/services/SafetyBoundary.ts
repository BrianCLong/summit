/**
 * Safety Boundary Service
 *
 * Implements "shipping controls" derived from safety research.
 * specifically Artifact B (Input Sanitization) and Artifact A (Constitution Check).
 */

import { logger } from '../utils/logger';

export interface SafetyCheckResult {
  safe: boolean;
  reason?: string;
  sanitizedInput?: string;
}

export interface Policy {
  name: string;
  rules: RegExp[];
  failureMode: 'BLOCK' | 'FLAG';
}

export class SafetyBoundary {
  private static instance: SafetyBoundary;

  // Basic Constitution: Disallow specific high-risk patterns in OUTPUT
  private constitution: Policy = {
    name: 'Basic Safety Constitution',
    rules: [
      /ignore previous instructions/i, // Potential output leak or jailbreak echo
      /as an AI language model/i, // Standard refusal (sometimes we want to catch this to handle gracefully)
      /\[INST\]/i, // Leaked tokens
    ],
    failureMode: 'BLOCK'
  };

  private constructor() {}

  static getInstance(): SafetyBoundary {
    if (!SafetyBoundary.instance) {
      SafetyBoundary.instance = new SafetyBoundary();
    }
    return SafetyBoundary.instance;
  }

  /**
   * Artifact B: Indirect Prompt Injection Defense
   * Wraps untrusted user/retrieved content in XML tags to delineate it from system instructions.
   * This is a "product mechanism" to enforce boundary separation.
   */
  public sanitizeInput(input: string, tag: string = 'user_data'): string {
    // 1. Remove any existing tags that might try to close the boundary
    const sanitized = input.replace(new RegExp(`</?${tag}>`, 'gi'), '[REDACTED_TAG]');

    // 2. Wrap in explicit boundary tags
    return `<${tag}>\n${sanitized}\n</${tag}>`;
  }

  /**
   * Artifact A: Constitution Check
   * Validates output against defined safety policies.
   */
  public verifyOutput(output: string, policy: Policy = this.constitution): SafetyCheckResult {
    for (const rule of policy.rules) {
      if (rule.test(output)) {
        logger.warn(`Safety Boundary Violation: Output matched rule ${rule}`);
        return {
          safe: false,
          reason: `Violated policy rule: ${rule}`
        };
      }
    }

    // Heuristic: Check for common injection success indicators if checking output of an "injection test"
    // (This is context dependent, but for a general safety boundary, we look for leaks)

    return { safe: true };
  }

  /**
   * Checks for specific injection patterns in INPUT (Pre-flight check).
   * While "Sanitization" wraps it, this explicitly rejects known attacks.
   */
  public scanInputForInjection(input: string): SafetyCheckResult {
    const injectionPatterns = [
      /ignore previous/i,
      /system instruction/i,
      /debug mode/i,
      /admin access/i
    ];

    for (const pattern of injectionPatterns) {
      if (pattern.test(input)) {
        logger.warn(`Safety Boundary Alert: Potential Injection detected: ${pattern}`);
        return {
          safe: false,
          reason: 'Potential Prompt Injection Detected'
        };
      }
    }
    return { safe: true };
  }
}

export const safetyBoundary = SafetyBoundary.getInstance();
