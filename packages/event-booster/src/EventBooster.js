"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBooster = void 0;
// @ts-nocheck
const node_perf_hooks_1 = require("node:perf_hooks");
const DEFAULT_PERFORMANCE_BUDGET_MS = 5;
const DEFAULT_HISTORY_LIMIT = 50;
const cloneEvent = (event) => ({
    ...event,
    payload: { ...event.payload },
    tags: event.tags ? [...event.tags] : undefined,
});
const freezeOptions = (options) => Object.freeze({ ...options });
/**
 * Core orchestrator that manages boost pattern registration, execution, and telemetry.
 */
class EventBooster {
    patterns = new Map();
    history = [];
    now;
    random;
    performanceBudgetMs;
    maxHistory;
    constructor(options = {}) {
        this.performanceBudgetMs =
            options.performanceBudgetMs ?? DEFAULT_PERFORMANCE_BUDGET_MS;
        this.maxHistory = Math.max(1, options.maxHistory ?? DEFAULT_HISTORY_LIMIT);
        this.now = options.now ?? (() => node_perf_hooks_1.performance.now());
        this.random = options.random ?? Math.random;
        if (options.initialPatterns) {
            for (const pattern of options.initialPatterns) {
                this.registerPattern(pattern);
            }
        }
    }
    /** Registers a new boost pattern. */
    registerPattern(pattern) {
        if (this.patterns.has(pattern.name)) {
            throw new Error(`Pattern "${pattern.name}" is already registered.`);
        }
        this.patterns.set(pattern.name, pattern);
    }
    /** Removes a registered pattern if present. */
    unregisterPattern(name) {
        return this.patterns.delete(name);
    }
    /** Returns metadata for registered patterns. */
    listPatterns() {
        return Array.from(this.patterns.values()).map((pattern) => ({
            name: pattern.name,
            description: pattern.description,
        }));
    }
    /** Determines if a pattern with the provided name exists. */
    hasPattern(name) {
        return this.patterns.has(name);
    }
    /** Retrieves a registered pattern instance. */
    getPattern(name) {
        return this.patterns.get(name);
    }
    /** Clears any recorded run summaries. */
    clearHistory() {
        this.history.length = 0;
    }
    /**
     * Returns a copy of the recorded history. The optional limit parameter can be used
     * to retrieve only the most recent entries.
     */
    getHistory(limit) {
        if (limit === undefined) {
            return [...this.history];
        }
        const safeLimit = Math.max(0, limit);
        return this.history.slice(Math.max(0, this.history.length - safeLimit));
    }
    /**
     * Executes the specified pattern against a batch of events and records telemetry.
     */
    boost(events, patternName, options = {}) {
        const pattern = this.patterns.get(patternName);
        if (!pattern) {
            throw new Error(`Pattern "${patternName}" is not registered.`);
        }
        const view = events.map(cloneEvent);
        const contextOptions = freezeOptions(options);
        const generated = [];
        const startedAt = this.now();
        for (let index = 0; index < view.length; index += 1) {
            const source = view[index];
            const derivatives = pattern.boost(source, {
                index,
                events: view,
                options: contextOptions,
                random: this.random,
            });
            for (const derivative of derivatives) {
                generated.push({
                    ...derivative,
                    boostPattern: derivative.boostPattern ?? pattern.name,
                    sourceEventId: derivative.sourceEventId ?? source.id,
                    tags: derivative.tags ? [...derivative.tags] : undefined,
                    payload: { ...derivative.payload },
                });
            }
        }
        const finishedAt = this.now();
        const durationMs = Math.max(0, finishedAt - startedAt);
        const summary = {
            patternName,
            inputCount: view.length,
            outputCount: generated.length,
            durationMs,
            budgetExceeded: durationMs > this.performanceBudgetMs,
            startedAt,
            finishedAt,
        };
        this.recordHistory(summary);
        return { ...summary, events: generated };
    }
    /** Convenience helper that generates events from a factory before boosting them. */
    boostFromGenerator(generator, patternName, options = {}) {
        return this.boost(generator(), patternName, options);
    }
    recordHistory(entry) {
        this.history.push(entry);
        if (this.history.length > this.maxHistory) {
            this.history.splice(0, this.history.length - this.maxHistory);
        }
    }
}
exports.EventBooster = EventBooster;
exports.default = EventBooster;
