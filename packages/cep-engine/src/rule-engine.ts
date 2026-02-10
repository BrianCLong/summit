import { EventEmitter } from 'eventemitter3';
import pino from 'pino';
import { BusinessRule, RuleContext } from './types';

const logger = pino({ name: 'rule-engine' });

/**
 * Business rule engine for real-time rule evaluation
 */
export class RuleEngine extends EventEmitter {
  private rules: Map<string, BusinessRule> = new Map();

  /**
   * Add rule
   */
  addRule(rule: BusinessRule): void {
    this.rules.set(rule.id, rule);
    logger.info({ ruleId: rule.id, name: rule.name }, 'Rule added');
  }

  /**
   * Remove rule
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
    logger.info({ ruleId }, 'Rule removed');
  }

  /**
   * Enable/disable rule
   */
  setRuleEnabled(ruleId: string, enabled: boolean): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  /**
   * Evaluate event against all rules
   */
  async evaluate(event: any, context?: RuleContext): Promise<RuleResult[]> {
    const ruleContext: RuleContext = context || {
      facts: new Map(),
      results: new Map(),
    };

    const results: RuleResult[] = [];

    // Sort rules by priority (higher first)
    const sortedRules = Array.from(this.rules.values())
      .filter((rule) => rule.enabled)
      .sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      try {
        const matched = rule.condition(event, ruleContext);

        if (matched) {
          await rule.action(event, ruleContext);

          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            matched: true,
            executedAt: Date.now(),
          });

          this.emit('rule-matched', { rule, event, context: ruleContext });
          logger.info({ ruleId: rule.id, name: rule.name }, 'Rule matched');
        }
      } catch (error) {
        logger.error({ error, ruleId: rule.id }, 'Rule evaluation failed');
        this.emit('rule-error', { rule, event, error });

        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          matched: false,
          error: String(error),
          executedAt: Date.now(),
        });
      }
    }

    return results;
  }

  /**
   * Get all rules
   */
  getRules(): BusinessRule[] {
    return Array.from(this.rules.values());
  }
}

export interface RuleResult {
  ruleId: string;
  ruleName: string;
  matched: boolean;
  error?: string;
  executedAt: number;
}
