"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
exports.resolvers = {
    Query: {
        twin: async (_, { id }, { twinService }) => {
            return twinService.getTwin(id);
        },
        twins: async (_, { type, state, tags }, { twinService }) => {
            return twinService.listTwins({ type, state, tags });
        },
    },
    Mutation: {
        createTwin: async (_, { input }, { twinService, userId }) => {
            return twinService.createTwin({
                name: input.name,
                type: input.type,
                description: input.description,
                initialState: input.initialState,
                tags: input.tags,
            }, userId);
        },
        updateTwinState: async (_, { input }, { twinService }) => {
            return twinService.updateState(input);
        },
        setTwinState: async (_, { twinId, state }, { twinService }) => {
            await twinService.setTwinState(twinId, state);
            return twinService.getTwin(twinId);
        },
        linkTwins: async (_, { sourceId, targetId, type, properties }, { twinService }) => {
            await twinService.linkTwins(sourceId, targetId, type, properties);
            return true;
        },
        runSimulation: async (_, { input }, { twinService, simulationEngine }) => {
            const twin = await twinService.getTwin(input.twinId);
            if (!twin) {
                throw new Error(`Twin not found: ${input.twinId}`);
            }
            await twinService.setTwinState(input.twinId, 'SIMULATING');
            try {
                const result = await simulationEngine.runSimulation(twin, input);
                await twinService.setTwinState(input.twinId, 'ACTIVE');
                return result;
            }
            catch (error) {
                await twinService.setTwinState(input.twinId, 'DEGRADED');
                throw error;
            }
        },
        deleteTwin: async (_, { id }, { twinService }) => {
            await twinService.deleteTwin(id);
            return true;
        },
    },
    DateTime: {
        serialize: (value) => value.toISOString(),
        parseValue: (value) => new Date(value),
    },
};
