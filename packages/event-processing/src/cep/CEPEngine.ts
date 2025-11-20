/**
 * Complex Event Processing Engine
 * Pattern matching, temporal correlation, and sequence detection
 */

import { EventEmitter } from 'events';
import type {
  Event,
  EventPattern,
  EventSequence,
  TemporalRelation,
  Alert,
  EventCondition,
} from '../types.js';

export class CEPEngine extends EventEmitter {
  private patterns: Map<string, EventPattern> = new Map();
  private activeSequences: Map<string, EventSequence[]> = new Map();
  private temporalRelations: Map<string, TemporalRelation[]> = new Map();
  private eventBuffer: Event[] = [];
  private maxBufferSize: number = 10000;

  constructor() {
    super();
  }

  /**
   * Register an event pattern
   */
  registerPattern(pattern: EventPattern): void {
    this.patterns.set(pattern.id, pattern);
    console.log(`Registered pattern: ${pattern.name}`);
    this.emit('pattern:registered', pattern);
  }

  /**
   * Remove a pattern
   */
  removePattern(patternId: string): void {
    this.patterns.delete(patternId);
    this.activeSequences.delete(patternId);
    console.log(`Removed pattern: ${patternId}`);
  }

  /**
   * Process an incoming event
   */
  async processEvent(event: Event): Promise<void> {
    // Add to buffer
    this.eventBuffer.push(event);

    // Maintain buffer size
    if (this.eventBuffer.length > this.maxBufferSize) {
      this.eventBuffer.shift();
    }

    // Check against all patterns
    for (const pattern of this.patterns.values()) {
      await this.matchPattern(event, pattern);
    }

    this.emit('event:processed', event);
  }

  /**
   * Process multiple events
   */
  async processEvents(events: Event[]): Promise<void> {
    for (const event of events) {
      await this.processEvent(event);
    }
  }

  /**
   * Match event against a pattern
   */
  private async matchPattern(event: Event, pattern: EventPattern): Promise<void> {
    // Check if event matches any condition in the pattern
    const matchesCondition = pattern.conditions.some(condition =>
      this.evaluateCondition(event, condition)
    );

    if (!matchesCondition) {
      return;
    }

    // Get or create sequence for this pattern
    let sequences = this.activeSequences.get(pattern.id) || [];

    // Check windowing
    if (pattern.windowConfig) {
      sequences = this.applyWindowing(sequences, pattern.windowConfig);
    }

    // Try to add event to existing sequences
    let addedToSequence = false;

    for (const sequence of sequences) {
      if (this.canAddToSequence(event, sequence, pattern)) {
        sequence.events.push(event);
        addedToSequence = true;

        // Check if sequence is complete
        if (this.isSequenceComplete(sequence, pattern)) {
          sequence.matched = true;
          sequence.endTime = event.timestamp;
          await this.handlePatternMatch(sequence, pattern);
        }
      }
    }

    // Create new sequence if event wasn't added to existing one
    if (!addedToSequence) {
      const newSequence: EventSequence = {
        id: `${pattern.id}-${Date.now()}-${Math.random()}`,
        pattern,
        events: [event],
        startTime: event.timestamp,
        matched: false,
      };
      sequences.push(newSequence);
    }

    this.activeSequences.set(pattern.id, sequences);
  }

  /**
   * Evaluate a condition against an event
   */
  private evaluateCondition(event: Event, condition: EventCondition): boolean {
    // Check event type if specified
    if (condition.eventType && event.eventType !== condition.eventType) {
      return false;
    }

    // Get field value
    const fieldValue = this.getFieldValue(event, condition.field);

    // Evaluate based on operator
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
   * Get field value from event (supports nested fields)
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
   * Check if event can be added to sequence
   */
  private canAddToSequence(
    event: Event,
    sequence: EventSequence,
    pattern: EventPattern
  ): boolean {
    // Check if sequence is already matched
    if (sequence.matched) {
      return false;
    }

    // Check temporal constraints
    if (pattern.windowConfig) {
      const timeSinceStart = event.timestamp - sequence.startTime;
      return timeSinceStart <= pattern.windowConfig.size;
    }

    return true;
  }

  /**
   * Check if sequence is complete
   */
  private isSequenceComplete(sequence: EventSequence, pattern: EventPattern): boolean {
    // For now, consider sequence complete if it has events matching all conditions
    const matchedConditions = new Set<number>();

    for (const event of sequence.events) {
      pattern.conditions.forEach((condition, index) => {
        if (this.evaluateCondition(event, condition)) {
          matchedConditions.add(index);
        }
      });
    }

    return matchedConditions.size === pattern.conditions.length;
  }

  /**
   * Handle pattern match
   */
  private async handlePatternMatch(
    sequence: EventSequence,
    pattern: EventPattern
  ): Promise<void> {
    console.log(`Pattern matched: ${pattern.name}`, sequence.events.length, 'events');

    // Execute action if defined
    if (pattern.action) {
      await this.executeAction(sequence, pattern);
    }

    // Emit event
    this.emit('pattern:matched', { pattern, sequence });

    // Remove matched sequence from active sequences
    const sequences = this.activeSequences.get(pattern.id) || [];
    const filtered = sequences.filter(s => s.id !== sequence.id);
    this.activeSequences.set(pattern.id, filtered);
  }

  /**
   * Execute pattern action
   */
  private async executeAction(sequence: EventSequence, pattern: EventPattern): Promise<void> {
    if (!pattern.action) return;

    switch (pattern.action.type) {
      case 'alert':
        await this.generateAlert(sequence, pattern);
        break;
      case 'aggregate':
        await this.aggregateEvents(sequence.events);
        break;
      case 'forward':
        this.emit('action:forward', sequence.events);
        break;
      case 'trigger':
        this.emit('action:trigger', { pattern, sequence });
        break;
      case 'custom':
        if (pattern.action.handler) {
          await pattern.action.handler(sequence.events);
        }
        break;
    }
  }

  /**
   * Generate alert from matched pattern
   */
  private async generateAlert(sequence: EventSequence, pattern: EventPattern): Promise<void> {
    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      severity: this.calculateAlertSeverity(sequence.events),
      title: `Pattern Match: ${pattern.name}`,
      description: pattern.description,
      events: sequence.events,
      pattern,
    };

    this.emit('alert:generated', alert);
  }

  /**
   * Calculate alert severity from events
   */
  private calculateAlertSeverity(events: Event[]): Alert['severity'] {
    const severities = events.map(e => e.severity).filter(Boolean);

    if (severities.includes('critical')) return 'critical';
    if (severities.includes('high')) return 'high';
    if (severities.includes('medium')) return 'medium';
    if (severities.includes('low')) return 'low';
    return 'info';
  }

  /**
   * Aggregate events
   */
  private async aggregateEvents(events: Event[]): Promise<void> {
    // Implement aggregation logic
    this.emit('events:aggregated', events);
  }

  /**
   * Apply windowing to sequences
   */
  private applyWindowing(
    sequences: EventSequence[],
    windowConfig: NonNullable<EventPattern['windowConfig']>
  ): EventSequence[] {
    const now = Date.now();

    switch (windowConfig.type) {
      case 'tumbling':
        return sequences.filter(seq => now - seq.startTime <= windowConfig.size);

      case 'sliding':
        return sequences.filter(seq => now - seq.startTime <= windowConfig.size);

      case 'session':
        // Remove sequences with gaps larger than windowConfig.gap
        return sequences.filter(seq => {
          if (seq.events.length < 2) return true;

          const sortedEvents = seq.events.sort((a, b) => a.timestamp - b.timestamp);
          for (let i = 1; i < sortedEvents.length; i++) {
            const gap = sortedEvents[i].timestamp - sortedEvents[i - 1].timestamp;
            if (gap > (windowConfig.gap || 5000)) {
              return false;
            }
          }
          return true;
        });

      default:
        return sequences;
    }
  }

  /**
   * Define temporal relation between events
   */
  defineTemporalRelation(relation: TemporalRelation): void {
    const key = `${relation.event1}-${relation.event2}`;
    const relations = this.temporalRelations.get(key) || [];
    relations.push(relation);
    this.temporalRelations.set(key, relations);
  }

  /**
   * Get all active sequences
   */
  getActiveSequences(): EventSequence[] {
    const allSequences: EventSequence[] = [];
    for (const sequences of this.activeSequences.values()) {
      allSequences.push(...sequences);
    }
    return allSequences;
  }

  /**
   * Clear event buffer
   */
  clearBuffer(): void {
    this.eventBuffer = [];
  }

  /**
   * Get event buffer
   */
  getEventBuffer(): Event[] {
    return [...this.eventBuffer];
  }
}
