const store = new Map();
export const MemoryStore = {
    async get(k) {
        return store.get(k);
    },
    async set(k, v) {
        store.set(k, v);
    },
};
//# sourceMappingURL=memory.js.map