import { TripletOrchestrator } from './orchestrator.js';
import { InMemoryMetricsSink } from './metrics.js';
import { InMemoryTripletPersister } from './persisters/memory.js';
import {
  ControlLoopHandle,
  LayerSignal,
  MetricsSink,
  TripletDefinition,
  TripletPersister,
  TripletSnapshot,
} from './types.js';

interface TripletRuntimeOptions {
  readonly orchestratorOptions: Parameters<typeof TripletOrchestrator>[0];
  readonly metricsSink?: MetricsSink;
  readonly persister?: TripletPersister;
  readonly logger?: (message: string, context?: Record<string, unknown>) => void;
}

export class TripletRuntime {
  private readonly orchestrator: TripletOrchestrator;
  private readonly metrics: MetricsSink;
  private readonly persister: TripletPersister;
  private readonly logger: (message: string, context?: Record<string, unknown>) => void;
  private readonly loops = new Map<string, ControlLoopHandle>();

  constructor(options: TripletRuntimeOptions) {
    this.metrics = options.metricsSink ?? new InMemoryMetricsSink();
    this.persister = options.persister ?? new InMemoryTripletPersister();
    this.logger = options.logger ?? (() => {});
    this.orchestrator = new TripletOrchestrator({
      ...options.orchestratorOptions,
      metricsSink: this.metrics,
    });
  }

  async register(definition: TripletDefinition): Promise<void> {
    const state = this.orchestrator.registerTriplet(definition);
    await this.persister.persist(state);
    this.logger('triplet.registered', { id: definition.id });
  }

  async ingest(tripletId: string, signals: LayerSignal[]): Promise<TripletSnapshot> {
    const result = this.orchestrator.tick(tripletId, signals);
    await this.persister.persist(result.state);
    this.logger('triplet.tick', { id: tripletId, actions: result.actions.length });
    return this.snapshot(tripletId);
  }

  async snapshot(tripletId: string): Promise<TripletSnapshot> {
    const definition = this.orchestrator.getDefinition(tripletId);
    if (!definition) {
      throw new Error(`Triplet ${tripletId} not registered`);
    }
    const persisted = await this.persister.load(tripletId);
    const state = persisted ?? this.orchestrator.getState(tripletId);
    if (!state) {
      throw new Error(`Triplet ${tripletId} state not found`);
    }
    return { definition, state };
  }

  beginControlLoop(tripletId: string, intervalMs: number): ControlLoopHandle {
    if (this.loops.has(tripletId)) {
      return this.loops.get(tripletId) as ControlLoopHandle;
    }
    const timer = setInterval(async () => {
      try {
        await this.ingest(tripletId, []);
        this.metrics.record({
          type: 'control-loop-heartbeat',
          tripletId,
          at: Date.now(),
          attributes: { intervalMs },
        });
      } catch (error) {
        this.logger('triplet.loop.error', { id: tripletId, error });
      }
    }, intervalMs);

    const handle: ControlLoopHandle = {
      tripletId,
      intervalMs,
      stop: () => clearInterval(timer),
    };
    this.loops.set(tripletId, handle);
    return handle;
  }

  stopControlLoop(tripletId: string): void {
    const handle = this.loops.get(tripletId);
    if (handle) {
      handle.stop();
      this.loops.delete(tripletId);
      this.logger('triplet.loop.stopped', { id: tripletId });
    }
  }
}
