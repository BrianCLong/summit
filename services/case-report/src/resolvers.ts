export const resolvers = {
  Query: { case_ping: () => 'ok' },
  Mutation: {
    case_open: (_: any, { title, sla }: { title: string; sla: string }) => ({
      id: `c_${Date.now()}`,
      title,
      sla,
      owners: [],
    }),
  },
};
