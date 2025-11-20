/**
 * Event Transformation
 * Transform, normalize, and convert event data
 */

import { EventEmitter } from 'events';
import type { Event, TransformationRule } from '../types.js';

export class EventTransformer extends EventEmitter {
  private transformationRules: Map<string, TransformationRule[]> = new Map();

  constructor() {
    super();
  }

  /**
   * Register transformation rule
   */
  registerTransformationRule(rule: TransformationRule): void {
    const eventType = rule.eventType || '*'; // '*' for all event types
    const rules = this.transformationRules.get(eventType) || [];
    rules.push(rule);
    this.transformationRules.set(eventType, rules);
    console.log(`Registered transformation rule: ${rule.id}`);
  }

  /**
   * Remove transformation rule
   */
  removeTransformationRule(ruleId: string): void {
    for (const [eventType, rules] of this.transformationRules) {
      const filtered = rules.filter(r => r.id !== ruleId);
      this.transformationRules.set(eventType, filtered);
    }
  }

  /**
   * Transform a single event
   */
  async transformEvent(event: Event): Promise<Event> {
    let transformedEvent = { ...event };

    // Apply event-type-specific rules
    const specificRules = this.transformationRules.get(event.eventType) || [];
    // Apply global rules
    const globalRules = this.transformationRules.get('*') || [];
    const allRules = [...specificRules, ...globalRules];

    for (const rule of allRules) {
      transformedEvent = await this.applyRule(transformedEvent, rule);
    }

    this.emit('event:transformed', transformedEvent);
    return transformedEvent;
  }

  /**
   * Transform multiple events
   */
  async transformEvents(events: Event[]): Promise<Event[]> {
    return Promise.all(events.map(event => this.transformEvent(event)));
  }

  /**
   * Apply transformation rule
   */
  private async applyRule(event: Event, rule: TransformationRule): Promise<Event> {
    let result = { ...event };

    for (const transformation of rule.transformations) {
      try {
        result = await this.applyTransformation(result, transformation);
      } catch (error) {
        console.error(`Transformation failed for field ${transformation.field}:`, error);
        this.emit('transformation:error', { event, transformation, error });
      }
    }

    return result;
  }

  /**
   * Apply single transformation
   */
  private async applyTransformation(
    event: Event,
    transformation: TransformationRule['transformations'][0]
  ): Promise<Event> {
    const result = { ...event };

    switch (transformation.operation) {
      case 'rename':
        return this.renameField(result, transformation);
      case 'convert':
        return this.convertField(result, transformation);
      case 'extract':
        return this.extractField(result, transformation);
      case 'mask':
        return this.maskField(result, transformation);
      case 'remove':
        return this.removeField(result, transformation);
      case 'add':
        return this.addField(result, transformation);
      default:
        return result;
    }
  }

  /**
   * Rename a field
   */
  private renameField(event: Event, transformation: any): Event {
    const { field, config } = transformation;
    const newName = config.newName;

    const value = this.getFieldValue(event, field);
    if (value !== undefined) {
      this.setFieldValue(event, newName, value);
      this.deleteFieldValue(event, field);
    }

    return event;
  }

  /**
   * Convert field type
   */
  private convertField(event: Event, transformation: any): Event {
    const { field, config } = transformation;
    const targetType = config.type;

    const value = this.getFieldValue(event, field);
    if (value === undefined) return event;

    let convertedValue: any;

    switch (targetType) {
      case 'string':
        convertedValue = String(value);
        break;
      case 'number':
        convertedValue = Number(value);
        break;
      case 'boolean':
        convertedValue = Boolean(value);
        break;
      case 'json':
        convertedValue = typeof value === 'string' ? JSON.parse(value) : value;
        break;
      case 'timestamp':
        convertedValue = new Date(value).getTime();
        break;
      default:
        convertedValue = value;
    }

    this.setFieldValue(event, field, convertedValue);
    return event;
  }

  /**
   * Extract field using regex
   */
  private extractField(event: Event, transformation: any): Event {
    const { field, config } = transformation;
    const pattern = new RegExp(config.pattern);
    const outputField = config.outputField || field;

    const value = this.getFieldValue(event, field);
    if (typeof value !== 'string') return event;

    const match = value.match(pattern);
    if (match) {
      const extracted = config.group ? match[config.group] : match[0];
      this.setFieldValue(event, outputField, extracted);
    }

    return event;
  }

  /**
   * Mask sensitive field
   */
  private maskField(event: Event, transformation: any): Event {
    const { field, config } = transformation;
    const maskChar = config.maskChar || '*';
    const preserveStart = config.preserveStart || 0;
    const preserveEnd = config.preserveEnd || 0;

    const value = this.getFieldValue(event, field);
    if (typeof value !== 'string') return event;

    const length = value.length;
    const start = value.substring(0, preserveStart);
    const end = value.substring(length - preserveEnd);
    const masked = maskChar.repeat(Math.max(0, length - preserveStart - preserveEnd));

    this.setFieldValue(event, field, start + masked + end);
    return event;
  }

  /**
   * Remove a field
   */
  private removeField(event: Event, transformation: any): Event {
    const { field } = transformation;
    this.deleteFieldValue(event, field);
    return event;
  }

  /**
   * Add a field
   */
  private addField(event: Event, transformation: any): Event {
    const { field, config } = transformation;
    this.setFieldValue(event, field, config.value);
    return event;
  }

  /**
   * Get field value (supports nested fields)
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

  /**
   * Set field value (supports nested fields)
   */
  private setFieldValue(event: Event, field: string, value: any): void {
    const parts = field.split('.');
    let obj: any = event;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in obj) || typeof obj[part] !== 'object') {
        obj[part] = {};
      }
      obj = obj[part];
    }

    obj[parts[parts.length - 1]] = value;
  }

  /**
   * Delete field value
   */
  private deleteFieldValue(event: Event, field: string): void {
    const parts = field.split('.');
    let obj: any = event;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in obj) || typeof obj[part] !== 'object') {
        return;
      }
      obj = obj[part];
    }

    delete obj[parts[parts.length - 1]];
  }
}
