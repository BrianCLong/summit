export const resolvers = {
  Query: {
    explainAnomaly: (_: any, { id }: { id: string }) => {
      // Mock response for now
      return {
        id,
        score: 0.95,
        explanation: 'This anomaly was detected due to unusual login patterns.',
        features: [
          { name: 'login_time', contribution: 0.8 },
          { name: 'location', contribution: 0.6 },
        ],
      };
    },
  },
};
