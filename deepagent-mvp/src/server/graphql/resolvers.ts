import { PubSub } from 'graphql-subscriptions';
import { AgentLoop } from '../../agent/loop';
import { ToolRegistry } from '../../tools/registry';
import { MemoryStore } from '../../agent/memory/store';

const pubsub = new PubSub();

export const resolvers = {
  Query: {
    run: async (_: any, { id, tenantId }: { id: string, tenantId: string }) => {
      const memoryStore = new MemoryStore();
      const events = await memoryStore.getEpisodicMemory(tenantId, id);
      const workingMemory = await memoryStore.getWorkingMemory(tenantId, id);
      // This is a simplified status. A real implementation would store the status in the database.
      const status = workingMemory ? 'COMPLETED' : 'IN_PROGRESS';
      return { id, status, events: events.map(e => e.event_json) };
    },
  },
  Mutation: {
    startRun: async (_: any, { input }: { input: any }) => {
      const agentLoop = new AgentLoop(input.tenantId, input.actor, input.task, input.goalHints, input.toolFilters);
      // We are not awaiting this call, because we want the agent to run in the background.
      agentLoop.start();
      return { id: agentLoop.getRunId(), status: 'RUNNING', events: [] };
    },
    registerTool: async (_: any, { input }: { input: any }) => {
      const toolRegistry = new ToolRegistry();
      const tool = await toolRegistry.registerTool(input.tenantId, input.name, input.description, input.openapi, input.auth, input.tags);
      return tool;
    },
  },
  Subscription: {
    runEvents: {
      subscribe: (_: any, { runId }: { runId: string }) => pubsub.asyncIterator(`RUN_EVENTS_${runId}`),
    },
  },
};
