module.exports = {
  createPool: () => ({
    getConnection: async () => ({
      query: async () => undefined,
      beginTransaction: async () => undefined,
      commit: async () => undefined,
      rollback: async () => undefined,
      release: () => undefined,
    }),
    query: async () => undefined,
    end: async () => undefined,
  }),
};
