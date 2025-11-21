import { PubSub } from 'graphql-subscriptions';
import { AgentLoop } from '../../agent/loop';
import { ToolRegistry } from '../../tools/registry';
import { MemoryStore } from '../../agent/memory/store';
import { AuthContext } from '../auth';

const pubsub = new PubSub();

export const resolvers = {
  Query: {
    run: async (_: any, { id }: { id: string }, context: AuthContext) => {
      const memoryStore = new MemoryStore();
      const events = await memoryStore.getEpisodicMemory(context.tenantId, id);
      const workingMemory = await memoryStore.getWorkingMemory(context.tenantId, id);
      // This is a simplified status. A real implementation would store the status in the database.
      const status = workingMemory ? 'COMPLETED' : 'IN_PROGRESS';
      return { id, status, events: events.map(e => e.event_json) };
    },
  },
  Mutation: {
    startRun: async (_: any, { input }: { input: any }, context: AuthContext) => {
      const agentLoop = new AgentLoop(context.tenantId, context.actor, input.task, input.goalHints, input.toolFilters, input.purpose);
      // We are not awaiting this call, because we want the agent to run in the background.
      agentLoop.start();
      return { id: agentLoop.getRunId(), status: 'RUNNING', events: [] };
    },
    registerTool: async (_: any, { input }: { input: any }, context: AuthContext) => {
      const toolRegistry = new ToolRegistry();
      const tool = await toolRegistry.registerTool(context.tenantId, input.name, input.description, input.openapi, input.auth, input.tags);
      return tool;
    },
  },
  Subscription: {
    runEvents: {
      subscribe: (_: any, { runId }: { runId:string }) => pubsub.asyncIterator(`RUN_EVENTS_${runId}`),
    },
  },
};
