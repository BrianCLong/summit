/**
 * @intelgraph/cep-engine
 * Advanced Complex Event Processing
 */

import { EventEmitter } from 'events';
import type { Event, EventPattern, CorrelationRule } from '@intelgraph/event-processing';

/**
 * Pattern Matcher
 * Advanced pattern matching with temporal constraints
 */
export class PatternMatcher extends EventEmitter {
  private patterns: Map<string, EventPattern> = new Map();
  private eventCache: Event[] = [];
  private maxCacheSize = 10000;

  registerPattern(pattern: EventPattern): void {
    this.patterns.set(pattern.id, pattern);
    this.emit('pattern:registered', pattern);
  }

  async matchEvents(events: Event[]): Promise<Map<string, Event[]>> {
    const matches = new Map<string, Event[]>();

    for (const pattern of this.patterns.values()) {
      const matched = this.findMatches(events, pattern);
      if (matched.length > 0) {
        matches.set(pattern.id, matched);
      }
    }

    return matches;
  }

  private findMatches(events: Event[], pattern: EventPattern): Event[] {
    return events.filter(event => {
      return pattern.conditions.every(condition => {
        if (condition.eventType && event.eventType !== condition.eventType) {
          return false;
        }
        return true;
      });
    });
  }
}

/**
 * Event Correlator
 * Correlates events across multiple streams
 */
export class EventCorrelator extends EventEmitter {
  private correlationRules: Map<string, CorrelationRule> = new Map();
  private correlatedGroups: Map<string, Event[]> = new Map();

  registerCorrelationRule(rule: CorrelationRule): void {
    this.correlationRules.set(rule.id, rule);
    console.log(`Registered correlation rule: ${rule.name}`);
  }

  async correlateEvents(events: Event[]): Promise<Map<string, Event[]>> {
    const correlated = new Map<string, Event[]>();

    for (const rule of this.correlationRules.values()) {
      const groups = this.groupByCorrelationKey(events, rule);

      for (const [key, groupEvents] of groups) {
        if (groupEvents.length >= rule.minEvents) {
          if (!rule.maxEvents || groupEvents.length <= rule.maxEvents) {
            correlated.set(`${rule.id}:${key}`, groupEvents);
            this.emit('events:correlated', { rule, events: groupEvents });
          }
        }
      }
    }

    return correlated;
  }

  private groupByCorrelationKey(events: Event[], rule: CorrelationRule): Map<string, Event[]> {
    const groups = new Map<string, Event[]>();
    const now = Date.now();

    for (const event of events) {
      if (!rule.eventTypes.includes(event.eventType) && !rule.eventTypes.includes('*')) {
        continue;
      }

      if (now - event.timestamp > rule.timeWindow) {
        continue;
      }

      const keyValue = this.getFieldValue(event, rule.correlationKey);
      const key = String(keyValue);

      const group = groups.get(key) || [];
      group.push(event);
      groups.set(key, group);
    }

    return groups;
  }

  private getFieldValue(event: Event, field: string): any {
    const parts = field.split('.');
    let value: any = event;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }
}

/**
 * Anomaly Detector
 * Detects anomalous patterns in event streams
 */
export class AnomalyDetector extends EventEmitter {
  private baselineStats: Map<string, { mean: number; stdDev: number }> = new Map();
  private threshold = 3; // Z-score threshold

  async detectAnomalies(events: Event[], field: string): Promise<Event[]> {
    const anomalies: Event[] = [];
    const values = events.map(e => this.getFieldValue(e, field)).filter(v => typeof v === 'number');

    if (values.length < 10) {
      return anomalies; // Not enough data
    }

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    for (const event of events) {
      const value = this.getFieldValue(event, field);
      if (typeof value !== 'number') continue;

      const zScore = Math.abs((value - mean) / stdDev);
      if (zScore > this.threshold) {
        anomalies.push(event);
        this.emit('anomaly:detected', { event, zScore, field });
      }
    }

    return anomalies;
  }

  private getFieldValue(event: Event, field: string): any {
    const parts = field.split('.');
    let value: any = event;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }
}

export { EventPattern, CorrelationRule, Event } from '@intelgraph/event-processing';
