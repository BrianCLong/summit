"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuleEngine = void 0;
const eventemitter3_1 = require("eventemitter3");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'rule-engine' });
/**
 * Business rule engine for real-time rule evaluation
 */
class RuleEngine extends eventemitter3_1.EventEmitter {
    rules = new Map();
    /**
     * Add rule
     */
    addRule(rule) {
        this.rules.set(rule.id, rule);
        logger.info({ ruleId: rule.id, name: rule.name }, 'Rule added');
    }
    /**
     * Remove rule
     */
    removeRule(ruleId) {
        this.rules.delete(ruleId);
        logger.info({ ruleId }, 'Rule removed');
    }
    /**
     * Enable/disable rule
     */
    setRuleEnabled(ruleId, enabled) {
        const rule = this.rules.get(ruleId);
        if (rule) {
            rule.enabled = enabled;
        }
    }
    /**
     * Evaluate event against all rules
     */
    async evaluate(event, context) {
        const ruleContext = context || {
            facts: new Map(),
            results: new Map(),
        };
        const results = [];
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
            }
            catch (error) {
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
    getRules() {
        return Array.from(this.rules.values());
    }
}
exports.RuleEngine = RuleEngine;
