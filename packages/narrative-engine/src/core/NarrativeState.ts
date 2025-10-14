import { Actor } from '../entities/Actor.js';
import { Relationship } from '../entities/Relationship.js';
import type { Event, RelationshipConfig } from './types.js';

export class NarrativeState {
  actors: Map<string, Actor> = new Map();
  events: Event[] = [];
  timestamp: number;
  private logs: string[] = [];

  constructor(initialTimestamp = 0) {
    this.timestamp = initialTimestamp;
  }

  addActor(actor: Actor): void {
    this.actors.set(actor.id, actor);
  }

  getActor(id: string): Actor | undefined {
    return this.actors.get(id);
  }

  ensureActor(id: string): Actor {
    const actor = this.actors.get(id);
    if (!actor) {
      throw new Error(`Actor ${id} not found in narrative state`);
    }
    return actor;
  }

  registerRelationship(config: RelationshipConfig): void {
    const source = this.ensureActor(config.sourceId);
    const target = this.ensureActor(config.targetId);
    const relationship = new Relationship({
      sourceId: config.sourceId,
      targetId: config.targetId,
      type: config.type,
      intensity: config.intensity,
      trust: config.trust,
    });
    source.addRelationship(relationship);
    const reciprocal = new Relationship({
      sourceId: config.targetId,
      targetId: config.sourceId,
      type:
        config.type === 'ally'
          ? 'ally'
          : config.type === 'rival'
          ? 'rival'
          : config.type === 'family'
          ? 'family'
          : 'neutral',
      intensity: config.intensity,
      trust: config.trust,
    });
    target.addRelationship(reciprocal);
  }

  recordEvent(event: Event): void {
    this.events.push(event);
  }

  advanceTime(step = 1): number {
    this.timestamp += step;
    return this.timestamp;
  }

  log(message: string): void {
    this.logs.push(message);
  }

  consumeLogs(): string[] {
    const copy = [...this.logs];
    this.logs = [];
    return copy;
  }

  toJSON(): {
    timestamp: number;
    events: Event[];
    actors: ReturnType<Actor['snapshot']>[];
    logs: string[];
  } {
    return {
      timestamp: this.timestamp,
      events: this.events.map((event) => ({ ...event })),
      actors: Array.from(this.actors.values()).map((actor) => actor.snapshot()),
      logs: this.logs.slice(),
    };
  }
}
