// @ts-nocheck
import { performance } from "node:perf_hooks";
import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from "prom-client";

const registry = new Registry();
collectDefaultMetrics({ register: registry });

const initializations = new Counter({
  name: "narrative_sim_initializations_total",
  help: "Number of narrative simulation initializations",
  registers: [registry],
});

const injectedEvents = new Counter({
  name: "narrative_sim_events_injected_total",
  help: "Number of events injected into the simulation runtime",
  registers: [registry],
});

const steps = new Counter({
  name: "narrative_sim_steps_total",
  help: "Number of simulation steps executed",
  registers: [registry],
});

const stepDuration = new Histogram({
  name: "narrative_sim_step_duration_seconds",
  help: "Execution time for simulation steps",
  buckets: [0.001, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [registry],
});

const queueDepth = new Gauge({
  name: "narrative_sim_event_queue_depth",
  help: "Current number of queued events awaiting processing",
  registers: [registry],
});

function logEvent(event: string, payload: Record<string, unknown>): void {
  const entry = {
    timestamp: new Date().toISOString(),
    event,
    ...payload,
  };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(entry));
}

export interface StepObservation {
  processedEvents: number;
  queuedEvents: number;
  durationMs: number;
}

export interface InitializationObservation {
  actorCount: number;
  relationshipCount: number;
  seedEvents: number;
}

export interface InjectionObservation {
  queuedEvents: number;
  eventType?: string;
}

export class NarrativeTelemetry {
  constructor(private readonly metricRegistry: Registry = registry) {}

  recordInitialization(observation: InitializationObservation): void {
    initializations.inc();
    queueDepth.set(0);
    logEvent("narrative_init", observation);
  }

  recordInjection(observation: InjectionObservation): void {
    injectedEvents.inc();
    queueDepth.set(observation.queuedEvents);
    logEvent("narrative_event_injected", observation);
  }

  recordStep(observation: StepObservation): void {
    steps.inc();
    stepDuration.observe(observation.durationMs / 1000);
    queueDepth.set(observation.queuedEvents);
    logEvent("narrative_step", observation);
  }

  log(event: string, payload: Record<string, unknown>): void {
    logEvent(event, payload);
  }

  logError(event: string, payload: Record<string, unknown>): void {
    logEvent(event, { level: "error", ...payload });
  }

  timer(): () => number {
    const start = performance.now();
    return () => performance.now() - start;
  }

  async metrics(): Promise<string> {
    return this.metricRegistry.metrics();
  }

  registry(): Registry {
    return this.metricRegistry;
  }
}

export const simulationTelemetry = new NarrativeTelemetry();
