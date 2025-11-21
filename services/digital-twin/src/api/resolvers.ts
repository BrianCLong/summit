import type { TwinService } from '../core/TwinService.js';
import type { SimulationEngine } from '../simulation/SimulationEngine.js';
import type { EventBus } from '../core/EventBus.js';
import type { DigitalTwin, SimulationResult, TwinState } from '../types/index.js';

interface Context {
  twinService: TwinService;
  simulationEngine: SimulationEngine;
  eventBus: EventBus;
  userId: string;
}

export const resolvers = {
  Query: {
    twin: async (
      _: unknown,
      { id }: { id: string },
      { twinService }: Context,
    ): Promise<DigitalTwin | null> => {
      return twinService.getTwin(id);
    },

    twins: async (
      _: unknown,
      { type, state, tags }: { type?: string; state?: TwinState; tags?: string[] },
      { twinService }: Context,
    ): Promise<DigitalTwin[]> => {
      return twinService.listTwins({ type, state, tags });
    },
  },

  Mutation: {
    createTwin: async (
      _: unknown,
      { input }: { input: { name: string; type: string; description?: string; initialState?: Record<string, unknown>; tags?: string[] } },
      { twinService, userId }: Context,
    ): Promise<DigitalTwin> => {
      return twinService.createTwin(
        {
          name: input.name,
          type: input.type as DigitalTwin['metadata']['type'],
          description: input.description,
          initialState: input.initialState,
          tags: input.tags,
        },
        userId,
      );
    },

    updateTwinState: async (
      _: unknown,
      { input }: { input: { twinId: string; properties: Record<string, unknown>; source: string; confidence?: number } },
      { twinService }: Context,
    ): Promise<DigitalTwin> => {
      return twinService.updateState(input);
    },

    setTwinState: async (
      _: unknown,
      { twinId, state }: { twinId: string; state: TwinState },
      { twinService }: Context,
    ): Promise<DigitalTwin> => {
      await twinService.setTwinState(twinId, state);
      return twinService.getTwin(twinId) as Promise<DigitalTwin>;
    },

    linkTwins: async (
      _: unknown,
      { sourceId, targetId, type, properties }: { sourceId: string; targetId: string; type: string; properties?: Record<string, unknown> },
      { twinService }: Context,
    ): Promise<boolean> => {
      await twinService.linkTwins(sourceId, targetId, type, properties);
      return true;
    },

    runSimulation: async (
      _: unknown,
      { input }: { input: { twinId: string; config: unknown; scenarios?: unknown[] } },
      { twinService, simulationEngine }: Context,
    ): Promise<SimulationResult> => {
      const twin = await twinService.getTwin(input.twinId);
      if (!twin) {
        throw new Error(`Twin not found: ${input.twinId}`);
      }

      await twinService.setTwinState(input.twinId, 'SIMULATING');

      try {
        const result = await simulationEngine.runSimulation(twin, input as any);
        await twinService.setTwinState(input.twinId, 'ACTIVE');
        return result;
      } catch (error) {
        await twinService.setTwinState(input.twinId, 'DEGRADED');
        throw error;
      }
    },

    deleteTwin: async (
      _: unknown,
      { id }: { id: string },
      { twinService }: Context,
    ): Promise<boolean> => {
      await twinService.deleteTwin(id);
      return true;
    },
  },

  DateTime: {
    serialize: (value: Date) => value.toISOString(),
    parseValue: (value: string) => new Date(value),
  },
};
