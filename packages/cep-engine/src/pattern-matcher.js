"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FraudPatterns = exports.PatternBuilder = exports.PatternMatcher = void 0;
const eventemitter3_1 = require("eventemitter3");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'pattern-matcher' });
/**
 * Pattern matcher for CEP
 */
class PatternMatcher extends eventemitter3_1.EventEmitter {
    patterns = new Map();
    activeMatches = new Map();
    maxActiveMatches = 1000;
    /**
     * Register pattern
     */
    registerPattern(pattern) {
        this.patterns.set(pattern.id, pattern);
        this.activeMatches.set(pattern.id, []);
        logger.info({ patternId: pattern.id, name: pattern.name }, 'Pattern registered');
    }
    /**
     * Process event against all patterns
     */
    processEvent(event) {
        const matches = [];
        for (const [patternId, pattern] of this.patterns) {
            const patternMatches = this.matchPattern(pattern, event);
            matches.push(...patternMatches);
        }
        return matches;
    }
    /**
     * Match event against pattern
     */
    matchPattern(pattern, event) {
        const matches = [];
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
            }
            else {
                logger.warn({ patternId: pattern.id }, 'Max active matches reached');
            }
        }
        return matches;
    }
    /**
     * Match element against event
     */
    matchElement(element, event, context) {
        try {
            return element.condition(event, context);
        }
        catch (error) {
            logger.error({ error, element: element.name }, 'Element match error');
            return false;
        }
    }
    /**
     * Create match context
     */
    createContext() {
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
    getPatternStats(patternId) {
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
    clearPattern(patternId) {
        this.activeMatches.delete(patternId);
        this.patterns.delete(patternId);
    }
}
exports.PatternMatcher = PatternMatcher;
/**
 * Common pattern builders
 */
class PatternBuilder {
    pattern = {
        sequence: [],
    };
    static create(id, name) {
        const builder = new PatternBuilder();
        builder.pattern.id = id;
        builder.pattern.name = name;
        return builder;
    }
    /**
     * Add pattern element
     */
    where(name, condition) {
        this.pattern.sequence.push({
            name,
            condition,
        });
        return this;
    }
    /**
     * Add time constraint
     */
    within(milliseconds) {
        this.pattern.timeConstraint = {
            withinMs: milliseconds,
        };
        return this;
    }
    /**
     * Build pattern
     */
    build() {
        if (!this.pattern.id || !this.pattern.name || !this.pattern.sequence?.length) {
            throw new Error('Pattern must have id, name, and at least one element');
        }
        return this.pattern;
    }
}
exports.PatternBuilder = PatternBuilder;
// Example patterns for fraud detection
exports.FraudPatterns = {
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
