/**
 * Event Filtering
 * Filter events based on rules and conditions
 */

import { EventEmitter } from 'events';
import type { Event, FilterRule, EventCondition } from '../types.js';

export class EventFilter extends EventEmitter {
  private filterRules: FilterRule[] = [];

  constructor() {
    super();
  }

  /**
   * Register filter rule
   */
  registerFilterRule(rule: FilterRule): void {
    this.filterRules.push(rule);
    console.log(`Registered filter rule: ${rule.id}`);
  }

  /**
   * Remove filter rule
   */
  removeFilterRule(ruleId: string): void {
    this.filterRules = this.filterRules.filter(r => r.id !== ruleId);
  }

  /**
   * Filter a single event
   */
  async filterEvent(event: Event): Promise<boolean> {
    for (const rule of this.filterRules) {
      const matches = this.evaluateRule(event, rule);

      if (rule.action === 'exclude' && matches) {
        this.emit('event:filtered', { event, rule });
        return false;
      }

      if (rule.action === 'include' && !matches) {
        this.emit('event:filtered', { event, rule });
        return false;
      }
    }

    return true;
  }

  /**
   * Filter multiple events
   */
  async filterEvents(events: Event[]): Promise<Event[]> {
    const filtered: Event[] = [];

    for (const event of events) {
      const shouldInclude = await this.filterEvent(event);
      if (shouldInclude) {
        filtered.push(event);
      }
    }

    return filtered;
  }

  /**
   * Evaluate filter rule
   */
  private evaluateRule(event: Event, rule: FilterRule): boolean {
    return rule.conditions.every(condition => this.evaluateCondition(event, condition));
  }

  /**
   * Evaluate condition
   */
  private evaluateCondition(event: Event, condition: EventCondition): boolean {
    if (condition.eventType && event.eventType !== condition.eventType) {
      return false;
    }

    const fieldValue = this.getFieldValue(event, condition.field);

    switch (condition.operator) {
      case 'eq':
        return fieldValue === condition.value;
      case 'ne':
        return fieldValue !== condition.value;
      case 'gt':
        return fieldValue > condition.value;
      case 'gte':
        return fieldValue >= condition.value;
      case 'lt':
        return fieldValue < condition.value;
      case 'lte':
        return fieldValue <= condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'contains':
        return typeof fieldValue === 'string' && fieldValue.includes(condition.value);
      case 'regex':
        return typeof fieldValue === 'string' && new RegExp(condition.value).test(fieldValue);
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      default:
        return false;
    }
  }

  /**
   * Get field value
   */
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
