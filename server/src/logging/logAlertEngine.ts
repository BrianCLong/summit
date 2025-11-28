import { EventEmitter } from 'events';
import type { LogEvent, LogLevel } from './logEventBus.js';

export interface LogAlertRule {
  id: string;
  name: string;
  description?: string;
  level?: LogLevel;
  pattern?: RegExp;
  windowSeconds?: number;
  threshold?: number;
  suppressSeconds?: number;
}

export interface LogAlert {
  ruleId: string;
  name: string;
  triggeredAt: string;
  events: LogEvent[];
}

export class LogAlertEngine extends EventEmitter {
  private readonly ruleWindows = new Map<string, LogEvent[]>();
  private readonly lastTriggered = new Map<string, number>();
  private readonly recentAlerts: LogAlert[] = [];

  constructor(private readonly rules: LogAlertRule[] = []) {
    super();
  }

  attach(bus: { subscribe: (listener: (event: LogEvent) => void) => () => void }): () => void {
    return bus.subscribe((event) => this.evaluate(event));
  }

  getRules(): LogAlertRule[] {
    return this.rules;
  }

  getRecentAlerts(limit = 20): LogAlert[] {
    return this.recentAlerts.slice(-limit).reverse();
  }

  registerRule(rule: LogAlertRule): void {
    this.rules.push(rule);
  }

  private evaluate(event: LogEvent): void {
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
        const alert: LogAlert = {
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

  private levelAtOrAbove(level: LogLevel, threshold: LogLevel): boolean {
    const order: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
    return order.indexOf(level) >= order.indexOf(threshold);
  }
}

export const defaultAlertRules: LogAlertRule[] = [
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
