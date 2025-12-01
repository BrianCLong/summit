/**
 * EventUpcaster - Event versioning and schema evolution
 *
 * Transform events from old versions to new versions
 */

import pino from 'pino';
import type { DomainEvent, EventUpcaster as IEventUpcaster } from '../store/types.js';

export class EventUpcasterChain {
  private upcasters: Map<string, IEventUpcaster[]> = new Map();
  private logger: pino.Logger;

  constructor() {
    this.logger = pino({ name: 'EventUpcasterChain' });
  }

  /**
   * Register an upcaster for an event type
   */
  register(eventType: string, upcaster: IEventUpcaster): void {
    if (!this.upcasters.has(eventType)) {
      this.upcasters.set(eventType, []);
    }

    const upcasters = this.upcasters.get(eventType)!;
    upcasters.push(upcaster);

    // Sort by fromVersion
    upcasters.sort((a, b) => a.fromVersion - b.fromVersion);

    this.logger.debug(
      { eventType, fromVersion: upcaster.fromVersion, toVersion: upcaster.toVersion },
      'Upcaster registered'
    );
  }

  /**
   * Upcast an event to the latest version
   */
  upcast(event: DomainEvent): DomainEvent {
    const upcasters = this.upcasters.get(event.eventType) || [];

    let currentEvent = event;
    let currentVersion = this.getEventSchemaVersion(event);

    for (const upcaster of upcasters) {
      if (currentVersion === upcaster.fromVersion) {
        currentEvent = upcaster.upcast(currentEvent);
        currentVersion = upcaster.toVersion;

        this.logger.debug(
          {
            eventType: event.eventType,
            fromVersion: upcaster.fromVersion,
            toVersion: upcaster.toVersion
          },
          'Event upcasted'
        );
      }
    }

    return currentEvent;
  }

  /**
   * Upcast multiple events
   */
  upcastMany(events: DomainEvent[]): DomainEvent[] {
    return events.map(event => this.upcast(event));
  }

  /**
   * Get event schema version from metadata
   */
  private getEventSchemaVersion(event: DomainEvent): number {
    // Schema version can be stored in metadata
    return (event.metadata as any)?.schemaVersion || 1;
  }

  /**
   * Check if event needs upcasting
   */
  needsUpcast(event: DomainEvent): boolean {
    const upcasters = this.upcasters.get(event.eventType) || [];
    const currentVersion = this.getEventSchemaVersion(event);

    return upcasters.some(u => u.fromVersion === currentVersion);
  }

  /**
   * Get latest version for event type
   */
  getLatestVersion(eventType: string): number {
    const upcasters = this.upcasters.get(eventType) || [];

    if (upcasters.length === 0) {
      return 1;
    }

    return Math.max(...upcasters.map(u => u.toVersion));
  }
}

/**
 * Helper functions for common upcasting scenarios
 */
export class UpcastHelpers {
  /**
   * Rename a field in event payload
   */
  static renameField(oldName: string, newName: string) {
    return (event: DomainEvent): DomainEvent => {
      const payload = { ...event.payload };

      if (oldName in payload) {
        payload[newName] = payload[oldName];
        delete payload[oldName];
      }

      return { ...event, payload };
    };
  }

  /**
   * Add a default field to event payload
   */
  static addField(fieldName: string, defaultValue: any) {
    return (event: DomainEvent): DomainEvent => {
      const payload = {
        ...event.payload,
        [fieldName]: defaultValue
      };

      return { ...event, payload };
    };
  }

  /**
   * Remove a field from event payload
   */
  static removeField(fieldName: string) {
    return (event: DomainEvent): DomainEvent => {
      const payload = { ...event.payload };
      delete payload[fieldName];

      return { ...event, payload };
    };
  }

  /**
   * Transform a field value
   */
  static transformField(
    fieldName: string,
    transform: (value: any) => any
  ) {
    return (event: DomainEvent): DomainEvent => {
      const payload = { ...event.payload };

      if (fieldName in payload) {
        payload[fieldName] = transform(payload[fieldName]);
      }

      return { ...event, payload };
    };
  }

  /**
   * Compose multiple upcasters
   */
  static compose(...upcasters: Array<(e: DomainEvent) => DomainEvent>) {
    return (event: DomainEvent): DomainEvent => {
      return upcasters.reduce((e, upcaster) => upcaster(e), event);
    };
  }
}
