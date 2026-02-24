import { EventEmitter } from 'eventemitter3';
import pino from 'pino';
import {
  Pattern,
  PatternMatch,
  MatchContext,
  PatternElement,
} from './types';

const logger = pino({ name: 'pattern-matcher' });

/**
 * Pattern matcher for CEP
 */
export class PatternMatcher extends EventEmitter {
  private patterns: Map<string, Pattern> = new Map();
  private activeMatches: Map<string, PartialMatch[]> = new Map();
  private maxActiveMatches: number = 1000;

  /**
   * Register pattern
   */
  registerPattern(pattern: Pattern): void {
    this.patterns.set(pattern.id, pattern);
    this.activeMatches.set(pattern.id, []);
    logger.info({ patternId: pattern.id, name: pattern.name }, 'Pattern registered');
  }

  /**
   * Process event against all patterns
   */
  processEvent(event: any): PatternMatch[] {
    const matches: PatternMatch[] = [];

    for (const [patternId, pattern] of this.patterns) {
      const patternMatches = this.matchPattern(pattern, event);
      matches.push(...patternMatches);
    }

    return matches;
  }

  /**
   * Match event against pattern
   */
  private matchPattern(pattern: Pattern, event: any): PatternMatch[] {
    const matches: PatternMatch[] = [];
    const active = this.activeMatches.get(pattern.id) || [];

    // Try to extend existing partial matches
    for (let i = active.length - 1; i >= 0; i--) {
      const partial = active[i];

      // Check time constraint
      if (pattern.timeConstraint) {
        const elapsed = Date.now() - partial.startTime;
        if (elapsed > pattern.timeConstraint.withinMs) {
          // Expired, remove
          active.splice(i, 1);
          continue;
        }
      }

      // Try to match next element
      const nextElement = pattern.sequence[partial.currentStep];
      if (this.matchElement(nextElement, event, partial.context)) {
        // Match found
        partial.events.push(event);
        partial.currentStep++;

        // Check if pattern is complete
        if (partial.currentStep >= pattern.sequence.length) {
          // Complete match
          matches.push({
            patternId: pattern.id,
            events: partial.events,
            variables: partial.context.variables,
            startTime: partial.startTime,
            endTime: Date.now(),
            confidence: 1.0,
          });

          // Remove completed match
          active.splice(i, 1);
        }
      }
    }

    // Try to start new match
    const firstElement = pattern.sequence[0];
    if (this.matchElement(firstElement, event, this.createContext())) {
      // Limit active matches to prevent memory issues
      if (active.length < this.maxActiveMatches) {
        active.push({
          events: [event],
          currentStep: 1,
          startTime: Date.now(),
          context: this.createContext(),
        });
      } else {
        logger.warn({ patternId: pattern.id }, 'Max active matches reached');
      }
    }

    return matches;
  }

  /**
   * Match element against event
   */
  private matchElement(
    element: PatternElement,
    event: any,
    context: MatchContext
  ): boolean {
    try {
      return element.condition(event, context);
    } catch (error) {
      logger.error({ error, element: element.name }, 'Element match error');
      return false;
    }
  }

  /**
   * Create match context
   */
  private createContext(): MatchContext {
    return {
      previousMatches: new Map(),
      variables: new Map(),
      startTime: Date.now(),
      currentTime: Date.now(),
    };
  }

  /**
   * Get pattern statistics
   */
  getPatternStats(patternId: string): PatternStats | null {
    if (!this.patterns.has(patternId)) {
      return null;
    }

    const active = this.activeMatches.get(patternId) || [];

    return {
      patternId,
      activeMatches: active.length,
      averageMatchTime: active.length > 0
        ? active.reduce((sum, m) => sum + (Date.now() - m.startTime), 0) / active.length
        : 0,
    };
  }

  /**
   * Clear pattern
   */
  clearPattern(patternId: string): void {
    this.activeMatches.delete(patternId);
    this.patterns.delete(patternId);
  }
}

interface PartialMatch {
  events: any[];
  currentStep: number;
  startTime: number;
  context: MatchContext;
}

interface PatternStats {
  patternId: string;
  activeMatches: number;
  averageMatchTime: number;
}

/**
 * Common pattern builders
 */
export class PatternBuilder {
  private pattern: Partial<Pattern> = {
    sequence: [],
  };

  static create(id: string, name: string): PatternBuilder {
    const builder = new PatternBuilder();
    builder.pattern.id = id;
    builder.pattern.name = name;
    return builder;
  }

  /**
   * Add pattern element
   */
  where(name: string, condition: (event: any, context: MatchContext) => boolean): this {
    this.pattern.sequence!.push({
      name,
      condition,
    });
    return this;
  }

  /**
   * Add time constraint
   */
  within(milliseconds: number): this {
    this.pattern.timeConstraint = {
      withinMs: milliseconds,
    };
    return this;
  }

  /**
   * Build pattern
   */
  build(): Pattern {
    if (!this.pattern.id || !this.pattern.name || !this.pattern.sequence?.length) {
      throw new Error('Pattern must have id, name, and at least one element');
    }

    return this.pattern as Pattern;
  }
}

// Example patterns for fraud detection
export const FraudPatterns = {
  /**
   * Rapid succession of failed login attempts
   */
  bruteForceLogin: PatternBuilder
    .create('brute-force-login', 'Brute Force Login Attempt')
    .where('failed-login-1', (e) => e.type === 'login' && e.success === false)
    .where('failed-login-2', (e) => e.type === 'login' && e.success === false)
    .where('failed-login-3', (e) => e.type === 'login' && e.success === false)
    .within(60000) // Within 1 minute
    .build(),

  /**
   * Unusual transaction pattern
   */
  unusualTransaction: PatternBuilder
    .create('unusual-transaction', 'Unusual Transaction Pattern')
    .where('small-transaction', (e) => e.type === 'transaction' && e.amount < 10)
    .where('large-transaction', (e) => e.type === 'transaction' && e.amount > 1000)
    .within(300000) // Within 5 minutes
    .build(),
};
