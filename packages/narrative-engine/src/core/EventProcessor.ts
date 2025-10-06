import { Actor } from '../entities/Actor.js';
import type { Event, StateUpdate } from './types.js';
import { NarrativeState } from './NarrativeState.js';

export class EventProcessor {
  private propagationLog: string[] = [];

  constructor(private readonly state: NarrativeState) {}

  processEvent(event: Event): StateUpdate {
    const actor = this.state.getActor(event.actorId);
    if (!actor) {
      const narrativeLog = [`Event ${event.id} ignored: actor ${event.actorId} missing`];
      return { actorMood: {}, triggeredEvents: [], narrativeLog };
    }

    const baseDelta = this.resolveMoodDelta(event);
    const newMood = actor.adjustMood(baseDelta);
    const logMessages = [
      `${actor.name} experienced ${event.type} (intensity ${event.intensity.toFixed(2)}) -> mood ${newMood.toFixed(2)}`,
    ];

    const triggeredEvents = this.generateTriggeredEvents(actor, event);
    this.propagateInfluence(actor);
    logMessages.push(...this.drainPropagationLog());

    return {
      actorMood: { [actor.id]: actor.getMood() },
      triggeredEvents,
      narrativeLog: logMessages,
    };
  }

  propagateInfluence(actor: Actor): void {
    this.propagationLog = [];
    const relationships = actor.getRelationships();
    for (const relationship of relationships) {
      const target = this.state.getActor(relationship.targetId);
      if (!target) {
        continue;
      }
      const influence = relationship.influenceFromMood(actor.getMood());
      if (Math.abs(influence) < 0.01) {
        continue;
      }
      const before = target.getMood();
      const after = target.adjustMood(influence / Math.max(1, target.getInfluence()));
      relationship.adjustTrust(Math.max(-0.05, Math.min(0.05, influence / 20)));
      this.propagationLog.push(
        `${actor.name} influenced ${target.name}: mood ${before.toFixed(2)} -> ${after.toFixed(2)}`
      );
    }
  }

  private drainPropagationLog(): string[] {
    const copy = [...this.propagationLog];
    this.propagationLog = [];
    return copy;
  }

  private resolveMoodDelta(event: Event): number {
    const base = event.payload?.moodDelta;
    if (typeof base === 'number') {
      return base * event.intensity;
    }
    switch (event.type) {
      case 'crisis':
        return -2.5 * event.intensity;
      case 'support':
        return 1.8 * event.intensity;
      case 'rumor':
        return -1.2 * event.intensity;
      case 'briefing':
        return 0.8 * event.intensity;
      default:
        return event.intensity;
    }
  }

  private generateTriggeredEvents(actor: Actor, event: Event): Event[] {
    const events: Event[] = [];
    if (actor.getMood() <= -5) {
      for (const relationship of actor.getRelationships()) {
        if (relationship.type === 'ally' || relationship.type === 'family') {
          events.push({
            id: `${event.id}-support-${relationship.targetId}-${Date.now()}`,
            type: 'support',
            actorId: relationship.targetId,
            targetId: actor.id,
            intensity: Math.max(0.5, Math.min(2, Math.abs(actor.getMood()) / 3)),
            timestamp: event.timestamp,
            payload: { escalatedFrom: event.id },
          });
        }
      }
    } else if (actor.getMood() >= 7) {
      for (const relationship of actor.getRelationships()) {
        if (relationship.type === 'ally') {
          events.push({
            id: `${event.id}-morale-${relationship.targetId}-${Date.now()}`,
            type: 'briefing',
            actorId: actor.id,
            targetId: relationship.targetId,
            intensity: Math.max(0.5, Math.min(1.5, actor.getMood() / 4)),
            timestamp: event.timestamp,
            payload: { moraleBoost: true },
          });
        }
      }
    }
    return events;
  }
}
