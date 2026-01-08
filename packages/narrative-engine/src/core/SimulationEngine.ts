import { Actor } from "../entities/Actor.js";
import { NarrativeState } from "./NarrativeState.js";
import { EventProcessor } from "./EventProcessor.js";
import type { Event, SimConfig, StateUpdate } from "./types.js";
import { NarrativeTelemetry, simulationTelemetry } from "../telemetry.js";

export class SimulationEngine {
  constructor(private readonly telemetry: NarrativeTelemetry = simulationTelemetry) {}

  private state: NarrativeState | null = null;
  private processor: EventProcessor | null = null;
  private initialized = false;
  private eventQueue: Event[] = [];

  initialize(config: SimConfig): void {
    this.state = new NarrativeState(config.initialTimestamp ?? 0);
    for (const actorConfig of config.actors) {
      const actor = new Actor({
        id: actorConfig.id,
        name: actorConfig.name,
        traits: actorConfig.traits,
        mood: actorConfig.mood,
        resilience: actorConfig.resilience,
        influence: actorConfig.influence,
      });
      this.state.addActor(actor);
    }

    if (config.relationships) {
      for (const relationship of config.relationships) {
        this.state.registerRelationship(relationship);
      }
    }

    this.processor = new EventProcessor(this.state);
    this.eventQueue = [];

    this.telemetry.recordInitialization({
      actorCount: config.actors.length,
      relationshipCount: config.relationships?.length ?? 0,
      seedEvents: config.seedEvents?.length ?? 0,
    });

    if (config.seedEvents) {
      for (const event of config.seedEvents) {
        this.eventQueue.push({ ...event });
      }
    }

    this.initialized = true;
  }

  step(): void {
    const currentState = this.ensureState();
    const processor = this.ensureProcessor();
    const stopTimer = this.telemetry.timer();
    currentState.advanceTime();
    const eventsToProcess = [...this.eventQueue];
    this.eventQueue = [];

    for (const event of eventsToProcess) {
      const processedEvent: Event = {
        ...event,
        timestamp: currentState.timestamp,
      };
      const update = processor.processEvent(processedEvent);
      this.applyStateUpdate(processedEvent, update);
    }

    this.telemetry.recordStep({
      processedEvents: eventsToProcess.length,
      queuedEvents: this.eventQueue.length,
      durationMs: stopTimer(),
    });
  }

  injectEvent(event: Event): void {
    this.ensureState();
    const timestamp =
      typeof event.timestamp === "number" ? event.timestamp : (this.state?.timestamp ?? 0);
    this.eventQueue.push({ ...event, timestamp });
    this.telemetry.recordInjection({
      queuedEvents: this.eventQueue.length,
      eventType: event.type,
    });
  }

  getState(): NarrativeState {
    return this.ensureState();
  }

  private applyStateUpdate(event: Event, update: StateUpdate): void {
    const state = this.ensureState();
    state.recordEvent(event);
    for (const message of update.narrativeLog) {
      state.log(message);
    }
    for (const triggered of update.triggeredEvents) {
      this.eventQueue.push({ ...triggered });
    }
  }

  private ensureState(): NarrativeState {
    if (!this.initialized || !this.state) {
      throw new Error("Simulation engine has not been initialized");
    }
    return this.state;
  }

  private ensureProcessor(): EventProcessor {
    if (!this.processor) {
      throw new Error("Simulation engine missing event processor");
    }
    return this.processor;
  }
}

export type { SimConfig, Event } from "./types.js";
