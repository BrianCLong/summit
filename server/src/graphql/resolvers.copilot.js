const { getGoalById } = require('../services/goalService'); // stub or in-memory from previous ticket

async function loadCopilotRouter() {
  try {
    return await import('../services/llm-router.service.js');
  } catch (error) {
    return await import('../services/llm-router.service.ts');
  }
}

const copilotResolvers = {
  Query: {
    copilotRun: async (_, { id }, { dataSources }) => {
      const { copilotOrchestrator } = dataSources;
      return copilotOrchestrator.getRunInfo(id);
    },
    
    copilotEvents: async (_, { runId, afterId, limit }, { dataSources }) => {
      const { copilotOrchestrator } = dataSources;
      const run = await copilotOrchestrator.store.getRun(runId);
      if (!run) throw new Error('Run not found');
      
      return copilotOrchestrator.store.listEvents(runId, { afterId, limit });
    },

    copilotRuns: async (_, { investigationId, status, limit = 20 }, { dataSources }) => {
      const { copilotOrchestrator } = dataSources;
      // TODO: Add proper filtering to store
      return copilotOrchestrator.store.findResumableRuns(investigationId);
    },

    copilotStats: async (_, { timeRange = '24 hours' }, { dataSources }) => {
      const { copilotOrchestrator } = dataSources;
      return copilotOrchestrator.getStats(timeRange);
    }
  },

  Mutation: {
    startCopilotRun: async (_, { goalId, goalText, investigationId, resume = false }, { dataSources, user }) => {
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
        userId: user?.id
      });
    },

    pauseCopilotRun: async (_, { runId }, { dataSources }) => {
      const { copilotOrchestrator } = dataSources;
      return copilotOrchestrator.pauseRun(runId);
    },

    resumeCopilotRun: async (_, { runId }, { dataSources }) => {
      const { copilotOrchestrator } = dataSources;
      const run = await copilotOrchestrator.store.getRun(runId);
      if (!run) throw new Error('Run not found');

      return copilotOrchestrator.resumeRun(run);
    },

    copilotExecute: async (
      _,
      { input },
      { user }
    ) => {
      if (!user?.id) {
        throw new Error('Authentication required');
      }

      const router = await loadCopilotRouter();
      const result = await router.execute({
        investigationId: input.investigationId,
        userId: user.id,
        text: input.prompt,
        attachments: input.attachments,
        requireCitations: input.requireCitations,
        classification: input.classification
      });

      return {
        text: result.text,
        meta: {
          provider: result.route.provider,
          model: result.route.model,
          costUsd: result.costUsd,
          tokensIn: result.tokensIn,
          tokensOut: result.tokensOut,
          latencyMs: result.latencyMs,
          provenanceId: result.provId,
          budgetRemaining: result.budgetRemaining
        },
        citations: result.citations || []
      };
    }
  },

  // Subscriptions for real-time updates
  Subscription: {
    copilotEvents: {
      subscribe: async (_, { runId }, { dataSources, pubsub }) => {
        // Verify run exists
        const { copilotOrchestrator } = dataSources;
        const run = await copilotOrchestrator.store.getRun(runId);
        if (!run) throw new Error('Run not found');

        return pubsub.asyncIterator(`COPILOT_EVENT_${runId}`);
      },
      resolve: (event) => event.payload
    }
  },

  // Field resolvers for nested data
  CopilotRun: {
    tasks: async (run, _, { dataSources }) => {
      const { copilotOrchestrator } = dataSources;
      return copilotOrchestrator.store.getTasksForRun(run.id);
    },

    events: async (run, { limit = 50 }, { dataSources }) => {
      const { copilotOrchestrator } = dataSources;
      return copilotOrchestrator.store.listEvents(run.id, { limit });
    },

    isActive: (run, _, { dataSources }) => {
      const { copilotOrchestrator } = dataSources;
      return copilotOrchestrator.activeRuns.has(run.id);
    }
  }
};

module.exports = { copilotResolvers };