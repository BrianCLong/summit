"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
const graphql_subscriptions_1 = require("graphql-subscriptions");
const loop_1 = require("../../agent/loop");
const registry_1 = require("../../tools/registry");
const store_1 = require("../../agent/memory/store");
const pubsub = new graphql_subscriptions_1.PubSub();
exports.resolvers = {
    Query: {
        run: async (_, { id }, context) => {
            const memoryStore = new store_1.MemoryStore();
            const events = await memoryStore.getEpisodicMemory(context.tenantId, id);
            const workingMemory = await memoryStore.getWorkingMemory(context.tenantId, id);
            // This is a simplified status. A real implementation would store the status in the database.
            const status = workingMemory ? 'COMPLETED' : 'IN_PROGRESS';
            return { id, status, events: events.map(e => e.event_json) };
        },
    },
    Mutation: {
        startRun: async (_, { input }, context) => {
            const agentLoop = new loop_1.AgentLoop(context.tenantId, context.actor, input.task, input.goalHints, input.toolFilters, input.purpose);
            // We are not awaiting this call, because we want the agent to run in the background.
            agentLoop.start();
            return { id: agentLoop.getRunId(), status: 'RUNNING', events: [] };
        },
        registerTool: async (_, { input }, context) => {
            const toolRegistry = new registry_1.ToolRegistry();
            const tool = await toolRegistry.registerTool(context.tenantId, input.name, input.description, input.openapi, input.auth, input.tags);
            return tool;
        },
    },
    Subscription: {
        runEvents: {
            subscribe: (_, { runId }) => pubsub.asyncIterator(`RUN_EVENTS_${runId}`),
        },
    },
};
