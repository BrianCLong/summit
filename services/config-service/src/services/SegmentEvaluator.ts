import { segmentRepository } from '../db/index.js';
import { logger } from '../utils/logger.js';
import type {
  Segment,
  SegmentRule,
  SegmentCondition,
  SegmentOperator,
  EvaluationContext,
} from '../types/index.js';

const log = logger.child({ module: 'SegmentEvaluator' });

/**
 * Evaluates segments and conditions against user context.
 */
export class SegmentEvaluator {
  /**
   * Check if a user matches a segment.
   */
  async matchesSegment(
    segmentId: string,
    context: EvaluationContext,
  ): Promise<boolean> {
    const segment = await segmentRepository.findById(segmentId);
    if (!segment) {
      log.warn({ segmentId }, 'Segment not found');
      return false;
    }

    return this.evaluateSegment(segment, context);
  }

  /**
   * Evaluate a segment against context.
   * A segment matches if ANY of its rules match (OR).
   */
  evaluateSegment(segment: Segment, context: EvaluationContext): boolean {
    if (segment.rules.length === 0) {
      // Empty rules means match everyone
      return true;
    }

    // OR logic between rules
    return segment.rules.some((rule) => this.evaluateRule(rule, context));
  }

  /**
   * Evaluate a single rule against context.
   * A rule matches if ALL conditions match (AND).
   */
  evaluateRule(rule: SegmentRule, context: EvaluationContext): boolean {
    // AND logic between conditions
    return rule.conditions.every((condition) =>
      this.evaluateCondition(condition, context),
    );
  }

  /**
   * Evaluate inline conditions (used in targeting rules).
   */
  evaluateConditions(
    conditions: SegmentCondition[],
    context: EvaluationContext,
  ): boolean {
    return conditions.every((condition) =>
      this.evaluateCondition(condition, context),
    );
  }

  /**
   * Evaluate a single condition against context.
   */
  evaluateCondition(
    condition: SegmentCondition,
    context: EvaluationContext,
  ): boolean {
    const { attribute, operator, value } = condition;
    const contextValue = this.getContextValue(attribute, context);

    try {
      return this.applyOperator(operator, contextValue, value);
    } catch (err) {
      log.warn(
        { attribute, operator, contextValue, value, err },
        'Error evaluating condition',
      );
      return false;
    }
  }

  /**
   * Get a value from the context by attribute path.
   * Supports dot notation for nested attributes.
   */
  private getContextValue(
    attribute: string,
    context: EvaluationContext,
  ): unknown {
    // Handle special top-level attributes
    switch (attribute) {
      case 'userId':
        return context.userId;
      case 'tenantId':
        return context.tenantId;
      case 'environment':
        return context.environment;
    }

    // Handle nested attributes in the attributes object
    if (attribute.startsWith('attributes.')) {
      const path = attribute.substring('attributes.'.length);
      return this.getNestedValue(context.attributes || {}, path);
    }

    // Try direct lookup in attributes
    return context.attributes?.[attribute];
  }

  /**
   * Get a nested value using dot notation.
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      if (typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  /**
   * Apply an operator to compare values.
   */
  private applyOperator(
    operator: SegmentOperator,
    contextValue: unknown,
    targetValue: unknown,
  ): boolean {
    switch (operator) {
      case 'equals':
        return this.equals(contextValue, targetValue);

      case 'not_equals':
        return !this.equals(contextValue, targetValue);

      case 'contains':
        return this.contains(contextValue, targetValue);

      case 'not_contains':
        return !this.contains(contextValue, targetValue);

      case 'starts_with':
        return this.startsWith(contextValue, targetValue);

      case 'ends_with':
        return this.endsWith(contextValue, targetValue);

      case 'in':
        return this.isIn(contextValue, targetValue);

      case 'not_in':
        return !this.isIn(contextValue, targetValue);

      case 'greater_than':
        return this.compare(contextValue, targetValue) > 0;

      case 'greater_than_or_equals':
        return this.compare(contextValue, targetValue) >= 0;

      case 'less_than':
        return this.compare(contextValue, targetValue) < 0;

      case 'less_than_or_equals':
        return this.compare(contextValue, targetValue) <= 0;

      case 'regex':
        return this.matchesRegex(contextValue, targetValue);

      case 'semver_equals':
        return this.semverCompare(contextValue, targetValue) === 0;

      case 'semver_greater_than':
        return this.semverCompare(contextValue, targetValue) > 0;

      case 'semver_less_than':
        return this.semverCompare(contextValue, targetValue) < 0;

      default:
        log.warn({ operator }, 'Unknown operator');
        return false;
    }
  }

  private equals(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a === null || a === undefined || b === null || b === undefined) {
      return false;
    }
    // Handle array equality
    if (Array.isArray(a) && Array.isArray(b)) {
      return (
        a.length === b.length && a.every((val, idx) => this.equals(val, b[idx]))
      );
    }
    // Handle object equality
    if (typeof a === 'object' && typeof b === 'object') {
      return JSON.stringify(a) === JSON.stringify(b);
    }
    // String comparison (case insensitive for strings)
    if (typeof a === 'string' && typeof b === 'string') {
      return a.toLowerCase() === b.toLowerCase();
    }
    return String(a) === String(b);
  }

  private contains(contextValue: unknown, targetValue: unknown): boolean {
    if (typeof contextValue === 'string' && typeof targetValue === 'string') {
      return contextValue.toLowerCase().includes(targetValue.toLowerCase());
    }
    if (Array.isArray(contextValue)) {
      return contextValue.some((item) => this.equals(item, targetValue));
    }
    return false;
  }

  private startsWith(contextValue: unknown, targetValue: unknown): boolean {
    if (typeof contextValue !== 'string' || typeof targetValue !== 'string') {
      return false;
    }
    return contextValue.toLowerCase().startsWith(targetValue.toLowerCase());
  }

  private endsWith(contextValue: unknown, targetValue: unknown): boolean {
    if (typeof contextValue !== 'string' || typeof targetValue !== 'string') {
      return false;
    }
    return contextValue.toLowerCase().endsWith(targetValue.toLowerCase());
  }

  private isIn(contextValue: unknown, targetValue: unknown): boolean {
    if (!Array.isArray(targetValue)) {
      return false;
    }
    return targetValue.some((item) => this.equals(contextValue, item));
  }

  private compare(a: unknown, b: unknown): number {
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() - b.getTime();
    }
    const strA = String(a);
    const strB = String(b);
    return strA.localeCompare(strB);
  }

  private matchesRegex(contextValue: unknown, pattern: unknown): boolean {
    if (typeof contextValue !== 'string' || typeof pattern !== 'string') {
      return false;
    }
    try {
      const regex = new RegExp(pattern, 'i');
      return regex.test(contextValue);
    } catch {
      return false;
    }
  }

  private semverCompare(a: unknown, b: unknown): number {
    const parseVersion = (v: unknown): number[] => {
      const str = String(v).replace(/^v/, '');
      const parts = str.split(/[.-]/).slice(0, 3);
      return parts.map((p) => parseInt(p, 10) || 0);
    };

    const vA = parseVersion(a);
    const vB = parseVersion(b);

    for (let i = 0; i < 3; i++) {
      const diff = (vA[i] || 0) - (vB[i] || 0);
      if (diff !== 0) return diff;
    }
    return 0;
  }
}

export const segmentEvaluator = new SegmentEvaluator();
