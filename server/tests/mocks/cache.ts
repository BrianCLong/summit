// Mock for @packages/cache
export const createCacheClient = () => ({
  get: async () => null,
  set: async () => {},
  del: async () => {},
  has: async () => false,
  clear: async () => {},
});

export default { createCacheClient };
