import { FlagService } from '../../featureflags/FlagService';
import { MemoryStore } from '../../featureflags/store/memory';

const service = new FlagService(MemoryStore);

export default {
  Query: {
    flag: (_: any, { key }: { key: string }, ctx: any) =>
      service.eval(ctx.tenantId || 't1', key),
  },
  Mutation: {
    setFlag: (_: any, { key, value }: { key: string; value: string }, ctx: any) =>
      service.setFlag(ctx.tenantId || 't1', key, value),
  },
};
