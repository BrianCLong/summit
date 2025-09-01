export class FlagService {
    constructor(store) {
        this.store = store;
    }
    async eval(tenantId, key) {
        const def = await this.store.get(`${tenantId}:${key}`);
        return (def?.value ?? false);
    }
    async setFlag(tenantId, key, value) {
        const decision = {
            key,
            value,
            reason: 'set',
            at: new Date().toISOString(),
        };
        await this.store.set(`${tenantId}:${key}`, decision);
        return decision;
    }
}
//# sourceMappingURL=FlagService.js.map