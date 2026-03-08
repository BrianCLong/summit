"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultAlertRules = exports.LogAlertEngine = void 0;
const events_1 = require("events");
class LogAlertEngine extends events_1.EventEmitter {
    rules;
    ruleWindows = new Map();
    lastTriggered = new Map();
    recentAlerts = [];
    constructor(rules = []) {
        super();
        this.rules = rules;
    }
    attach(bus) {
        return bus.subscribe((event) => this.evaluate(event));
    }
    getRules() {
        return this.rules;
    }
    getRecentAlerts(limit = 20) {
        return this.recentAlerts.slice(-limit).reverse();
    }
    registerRule(rule) {
        this.rules.push(rule);
    }
    evaluate(event) {
        this.rules.forEach((rule) => {
            if (rule.level && !this.levelAtOrAbove(event.level, rule.level)) {
                return;
            }
            if (rule.pattern && !rule.pattern.test(event.message)) {
                return;
            }
            const window = this.ruleWindows.get(rule.id) ?? [];
            const now = Date.now();
            const windowMs = (rule.windowSeconds ?? 60) * 1000;
            const suppressMs = (rule.suppressSeconds ?? 0) * 1000;
            const filtered = window.filter((entry) => now - Date.parse(entry.timestamp ?? '') <= windowMs);
            filtered.push(event);
            this.ruleWindows.set(rule.id, filtered);
            if (filtered.length >= (rule.threshold ?? 1)) {
                const last = this.lastTriggered.get(rule.id) ?? 0;
                if (now - last < suppressMs) {
                    return;
                }
                this.lastTriggered.set(rule.id, now);
                const alert = {
                    ruleId: rule.id,
                    name: rule.name,
                    triggeredAt: new Date(now).toISOString(),
                    events: [...filtered],
                };
                this.recentAlerts.push(alert);
                if (this.recentAlerts.length > 50) {
                    this.recentAlerts.shift();
                }
                this.emit('alert', alert);
            }
        });
    }
    levelAtOrAbove(level, threshold) {
        const order = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
        return order.indexOf(level) >= order.indexOf(threshold);
    }
}
exports.LogAlertEngine = LogAlertEngine;
exports.defaultAlertRules = [
    {
        id: 'error-burst',
        name: 'Error burst',
        description: 'More than 5 errors within 60 seconds',
        level: 'error',
        windowSeconds: 60,
        threshold: 5,
        suppressSeconds: 120,
    },
    {
        id: 'http-5xx',
        name: 'HTTP 5xx detected',
        description: 'Any 5xx or fatal log line triggers an alert',
        pattern: /(5\d{2}|fatal)/i,
        level: 'error',
        windowSeconds: 30,
        threshold: 1,
        suppressSeconds: 30,
    },
    {
        id: 'authentication-issues',
        name: 'Authentication failures',
        description: 'Multiple authentication failures detected',
        pattern: /(auth|login).*fail/i,
        level: 'warn',
        windowSeconds: 120,
        threshold: 3,
        suppressSeconds: 180,
    },
];
