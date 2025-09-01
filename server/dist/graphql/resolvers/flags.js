import { FlagService } from '../../featureflags/FlagService';
import { MemoryStore } from '../../featureflags/store/memory';
const service = new FlagService(MemoryStore);
export default {
    Query: {
        flag: (_, { key }, ctx) => service.eval(ctx.tenantId || 't1', key),
    },
    Mutation: {
        setFlag: (_, { key, value }, ctx) => service.setFlag(ctx.tenantId || 't1', key, value),
    },
};
//# sourceMappingURL=flags.js.map