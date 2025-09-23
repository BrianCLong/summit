const store = require('../copilot/store.memory');
const { startRun } = require('../copilot/orchestrator');
const { getGoalById } = require('../services/goalService'); // stub or in-memory from previous ticket

const copilotResolvers = {
  Query: {
    copilotRun: (_, { id }) => store.getRun(id),
    copilotEvents: (_, { runId }) => store.listEvents(runId),
  },
  Mutation: {
    startCopilotRun: async (_, { goalId }) => {
      const goal = await getGoalById(goalId);
      if (!goal) throw new Error('Goal not found');
      return startRun(goalId, goal.text);
    },
  },
};

module.exports = { copilotResolvers };