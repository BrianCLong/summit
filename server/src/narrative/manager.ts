import { randomUUID } from "node:crypto";
import { NarrativeSimulationEngine } from "./engine.js";
import type {
  SimulationConfig,
  SimulationSummary,
  NarrativeState,
  NarrativeEvent,
  NarrativeGeneratorMode,
} from "./types.js";

interface CreateSimulationInput {
  name: string;
  themes: string[];
  tickIntervalMinutes?: number;
  initialEntities: SimulationConfig["initialEntities"];
  initialParameters?: SimulationConfig["initialParameters"];
  generatorMode?: NarrativeGeneratorMode;
  llmClient?: SimulationConfig["llmClient"];
  metadata?: Record<string, unknown>;
}

export class NarrativeSimulationManager {
  private static instance: NarrativeSimulationManager;
  private readonly simulations = new Map<string, NarrativeSimulationEngine>();

  static getInstance(): NarrativeSimulationManager {
    if (!NarrativeSimulationManager.instance) {
      NarrativeSimulationManager.instance = new NarrativeSimulationManager();
    }
    return NarrativeSimulationManager.instance;
  }

  createSimulation(input: CreateSimulationInput): NarrativeState {
    const id = randomUUID();
    const config: SimulationConfig = {
      id,
      name: input.name,
      themes: input.themes,
      tickIntervalMinutes: input.tickIntervalMinutes ?? 60,
      initialEntities: input.initialEntities,
      initialParameters: input.initialParameters,
      generatorMode: input.generatorMode,
      llmClient: input.llmClient,
      metadata: input.metadata,
    };

    const engine = new NarrativeSimulationEngine(config);
    this.simulations.set(id, engine);
    return engine.getState();
  }

  getState(id: string): NarrativeState | undefined {
    return this.simulations.get(id)?.getState();
  }

  getEngine(id: string): NarrativeSimulationEngine | undefined {
    return this.simulations.get(id);
  }

  list(): SimulationSummary[] {
    return Array.from(this.simulations.values()).map((engine) => engine.getSummary());
  }

  remove(id: string): boolean {
    return this.simulations.delete(id);
  }

  queueEvent(id: string, event: NarrativeEvent): void {
    const engine = this.getEngine(id);
    if (!engine) {
      throw new Error(`Simulation ${id} not found`);
    }
    engine.queueEvent(event);
  }

  injectActorAction(
    id: string,
    actorId: string,
    description: string,
    overrides?: Partial<NarrativeEvent>,
  ): void {
    const engine = this.getEngine(id);
    if (!engine) {
      throw new Error(`Simulation ${id} not found`);
    }
    engine.injectActorAction(actorId, description, overrides);
  }

  async tick(id: string, steps = 1): Promise<NarrativeState> {
    const engine = this.getEngine(id);
    if (!engine) {
      throw new Error(`Simulation ${id} not found`);
    }
    return engine.tick(steps);
  }
}

export const narrativeSimulationManager = NarrativeSimulationManager.getInstance();
