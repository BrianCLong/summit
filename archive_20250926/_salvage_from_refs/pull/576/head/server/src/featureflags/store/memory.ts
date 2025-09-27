const store = new Map<string, any>();

export const MemoryStore = {
  async get(k: string) {
    return store.get(k);
  },
  async set(k: string, v: any) {
    store.set(k, v);
  },
};
