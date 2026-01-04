/* eslint-disable @typescript-eslint/no-explicit-any */
import { getGoalById } from '../services/goalService';

const copilotResolvers = {
  Query: {
    copilotRun: async (_: any, { id }: any, { dataSources }: any) => {
      const { copilotOrchestrator } = dataSources;
      return copilotOrchestrator.getRunInfo(id);
    },

    copilotEvents: async (_: any, { runId, afterId, limit }: any, { dataSources }: any) => {
      const { copilotOrchestrator } = dataSources;
      const run = await copilotOrchestrator.store.getRun(runId);
      if (!run) throw new Error('Run not found');

      return copilotOrchestrator.store.listEvents(runId, { afterId, limit });
    },

    copilotRuns: async (
      _: any,
      { investigationId, status, limit = 20 }: any,
      { dataSources }: any,
    ) => {
      const { copilotOrchestrator } = dataSources;
      // TODO: Add proper filtering to store
      return copilotOrchestrator.store.findResumableRuns(investigationId);
    },

    copilotStats: async (_: any, { timeRange = '24 hours' }: any, { dataSources }: any) => {
      const { copilotOrchestrator } = dataSources;
      return copilotOrchestrator.getStats(timeRange);
    },
  },

  Mutation: {
    startCopilotRun: async (
      _: any,
      { goalId, goalText, investigationId, resume = false }: any,
      { dataSources, user }: any,
    ) => {
      const { copilotOrchestrator } = dataSources;

      // If goalId provided, get goal text
      let goal = goalText;
      if (goalId && !goal) {
        const goalData = await getGoalById(goalId);
        if (!goalData) throw new Error('Goal not found');
        goal = goalData.text;
      }

      if (!goal) {
        throw new Error('Goal text or goalId is required');
      }

      return copilotOrchestrator.startRun(goalId, goal, {
        resume,
        investigationId,
        userId: user?.id,
      });
    },

    pauseCopilotRun: async (_: any, { runId }: any, { dataSources }: any) => {
      const { copilotOrchestrator } = dataSources;
      return copilotOrchestrator.pauseRun(runId);
    },

    resumeCopilotRun: async (_: any, { runId }: any, { dataSources }: any) => {
      const { copilotOrchestrator } = dataSources;
      const run = await copilotOrchestrator.store.getRun(runId);
      if (!run) throw new Error('Run not found');

      return copilotOrchestrator.resumeRun(run);
    },
  },

  // Subscriptions for real-time updates
  Subscription: {
    copilotEvents: {
      subscribe: async (_: any, { runId }: any, { dataSources, pubsub }: any) => {
        // Verify run exists
        const { copilotOrchestrator } = dataSources;
        const run = await copilotOrchestrator.store.getRun(runId);
        if (!run) throw new Error('Run not found');

        return pubsub.asyncIterator(`COPILOT_EVENT_${runId}`);
      },
      resolve: (event: any) => event.payload,
    },
  },

  // Field resolvers for nested data
  CopilotRun: {
    tasks: async (run: any, _: any, { dataSources }: any) => {
      const { copilotOrchestrator } = dataSources;
      return copilotOrchestrator.store.getTasksForRun(run.id);
    },

    events: async (run: any, { limit = 50 }: any, { dataSources }: any) => {
      const { copilotOrchestrator } = dataSources;
      return copilotOrchestrator.store.listEvents(run.id, { limit });
    },

    isActive: (run: any, _: any, { dataSources }: any) => {
      const { copilotOrchestrator } = dataSources;
      return copilotOrchestrator.activeRuns.has(run.id);
    },
  },
};

export default copilotResolvers;
