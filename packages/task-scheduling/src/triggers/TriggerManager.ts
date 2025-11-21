/**
 * Trigger Manager for event-driven and manual triggers
 */

import { EventEmitter } from '../utils/EventEmitter.js';
import { generateId } from '../utils/uuid.js';

export type TriggerType = 'manual' | 'event' | 'external' | 'data' | 'time';

export interface TriggerConfig {
  triggerId: string;
  dagId: string;
  type: TriggerType;
  enabled?: boolean;
  params?: Record<string, any>;
  condition?: (event: TriggerEvent) => boolean;
}

export interface TriggerEvent {
  eventId: string;
  triggerId: string;
  type: string;
  data: any;
  timestamp: Date;
  source?: string;
}

export interface TriggerExecution {
  executionId: string;
  triggerId: string;
  dagId: string;
  event: TriggerEvent;
  timestamp: Date;
  params?: Record<string, any>;
}

interface TriggerManagerEvents {
  'trigger:fired': (execution: TriggerExecution) => void;
  'trigger:added': (trigger: TriggerConfig) => void;
  'trigger:removed': (triggerId: string) => void;
  'trigger:enabled': (triggerId: string) => void;
  'trigger:disabled': (triggerId: string) => void;
}

export class TriggerManager extends EventEmitter<TriggerManagerEvents> {
  private triggers: Map<string, TriggerConfig>;
  private eventSubscriptions: Map<string, Set<string>>;

  constructor() {
    super();
    this.triggers = new Map();
    this.eventSubscriptions = new Map();
  }

  /**
   * Add a trigger
   */
  addTrigger(config: TriggerConfig): void {
    if (this.triggers.has(config.triggerId)) {
      throw new Error(`Trigger ${config.triggerId} already exists`);
    }

    const triggerConfig: TriggerConfig = {
      ...config,
      enabled: config.enabled !== false,
    };

    this.triggers.set(config.triggerId, triggerConfig);
    this.emit('trigger:added', triggerConfig);
  }

  /**
   * Remove a trigger
   */
  removeTrigger(triggerId: string): void {
    this.triggers.delete(triggerId);
    this.emit('trigger:removed', triggerId);
  }

  /**
   * Enable a trigger
   */
  enableTrigger(triggerId: string): void {
    const trigger = this.triggers.get(triggerId);
    if (trigger) {
      trigger.enabled = true;
      this.emit('trigger:enabled', triggerId);
    }
  }

  /**
   * Disable a trigger
   */
  disableTrigger(triggerId: string): void {
    const trigger = this.triggers.get(triggerId);
    if (trigger) {
      trigger.enabled = false;
      this.emit('trigger:disabled', triggerId);
    }
  }

  /**
   * Fire a manual trigger
   */
  fireTrigger(triggerId: string, data?: any): void {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) {
      throw new Error(`Trigger ${triggerId} not found`);
    }

    if (!trigger.enabled) {
      throw new Error(`Trigger ${triggerId} is disabled`);
    }

    const event: TriggerEvent = {
      eventId: generateId(),
      triggerId,
      type: 'manual',
      data,
      timestamp: new Date(),
    };

    this.processTrigger(trigger, event);
  }

  /**
   * Handle external event
   */
  handleEvent(eventType: string, data: any, source?: string): void {
    const event: TriggerEvent = {
      eventId: generateId(),
      triggerId: '',
      type: eventType,
      data,
      timestamp: new Date(),
      source,
    };

    // Find matching triggers
    this.triggers.forEach(trigger => {
      if (!trigger.enabled) return;
      if (trigger.type !== 'event' && trigger.type !== 'external') return;

      // Check condition
      if (trigger.condition && !trigger.condition(event)) {
        return;
      }

      event.triggerId = trigger.triggerId;
      this.processTrigger(trigger, event);
    });
  }

  /**
   * Process a trigger
   */
  private processTrigger(trigger: TriggerConfig, event: TriggerEvent): void {
    const execution: TriggerExecution = {
      executionId: generateId(),
      triggerId: trigger.triggerId,
      dagId: trigger.dagId,
      event,
      timestamp: new Date(),
      params: {
        ...trigger.params,
        trigger_event: event,
      },
    };

    this.emit('trigger:fired', execution);
  }

  /**
   * Subscribe to event type
   */
  subscribeToEvent(eventType: string, triggerId: string): void {
    if (!this.eventSubscriptions.has(eventType)) {
      this.eventSubscriptions.set(eventType, new Set());
    }
    this.eventSubscriptions.get(eventType)!.add(triggerId);
  }

  /**
   * Unsubscribe from event type
   */
  unsubscribeFromEvent(eventType: string, triggerId: string): void {
    const subscriptions = this.eventSubscriptions.get(eventType);
    if (subscriptions) {
      subscriptions.delete(triggerId);
    }
  }

  /**
   * Get trigger
   */
  getTrigger(triggerId: string): TriggerConfig | undefined {
    return this.triggers.get(triggerId);
  }

  /**
   * Get all triggers
   */
  getAllTriggers(): TriggerConfig[] {
    return Array.from(this.triggers.values());
  }

  /**
   * Get triggers for DAG
   */
  getTriggersForDAG(dagId: string): TriggerConfig[] {
    return Array.from(this.triggers.values()).filter(t => t.dagId === dagId);
  }
}
