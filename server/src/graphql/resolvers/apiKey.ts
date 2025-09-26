import ApiKeyService from '../../services/ApiKeyService.js';

const service = new ApiKeyService();

function assertAdmin(ctx: any) {
  const role = ctx?.user?.role;
  if (role !== 'ADMIN') {
    throw new Error('forbidden');
  }
}

export const apiKeyResolvers = {
  Query: {
    async apiKeys(_parent: unknown, args: { includeRevoked?: boolean }, ctx: any) {
      assertAdmin(ctx);
      const tenantId = ctx?.user?.tenantId ?? null;
      return service.listKeys({ tenantId, includeRevoked: args?.includeRevoked });
    },
  },
  Mutation: {
    async createApiKey(
      _parent: unknown,
      args: { input: { name: string; scope: string; expiresAt: string; tenantId?: string | null } },
      ctx: any,
    ) {
      assertAdmin(ctx);
      const expiresAt = new Date(args.input.expiresAt);
      if (Number.isNaN(expiresAt.getTime())) {
        throw new Error('Invalid expiration date');
      }

      const tenantId = args.input.tenantId ?? ctx?.user?.tenantId ?? null;
      const { secret, apiKey } = await service.createKey({
        name: args.input.name,
        scope: args.input.scope as any,
        expiresAt,
        createdBy: ctx?.user?.id ?? null,
        tenantId,
      });

      return { key: secret, apiKey };
    },
    async revokeApiKey(_parent: unknown, args: { id: string }, ctx: any) {
      assertAdmin(ctx);
      return service.revokeKey(args.id, ctx?.user?.id ?? null);
    },
  },
};

export default apiKeyResolvers;
