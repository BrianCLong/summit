export const alertsResolvers = {
  Query: {
    alerts: async () => [
      { id: '1', level: 'INFO', message: 'Sample alert' },
    ],
  },
};
