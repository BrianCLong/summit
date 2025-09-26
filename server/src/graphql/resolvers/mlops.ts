import logger from '../../config/logger.js';
import { mlflowService } from '../../services/mlflowService.js';

const log = logger.child({ module: 'MlopsResolvers' });

export const mlopsResolvers = {
  Query: {
    async mlModelVersions(_parent: unknown, args: { modelName: string }, ctx: any) {
      if (!ctx?.user) {
        throw new Error('Not authenticated');
      }
      return await mlflowService.listModelVersions(args.modelName);
    },
  },
  Mutation: {
    async deployModelVersion(
      _parent: unknown,
      args: { input: { modelName: string; version: string; namespace?: string; image?: string } },
      ctx: any,
    ) {
      if (!ctx?.user) {
        throw new Error('Not authenticated');
      }
      const role = ctx.user?.role || 'VIEWER';
      const allowedRoles = ['ADMIN', 'OPERATOR', 'ML_ENGINEER'];
      if (!allowedRoles.includes(role)) {
        log.warn('User attempted to deploy model without permission', {
          userId: ctx.user?.id,
          role,
        });
        throw new Error('Insufficient permissions to deploy model version');
      }

      return await mlflowService.deployModelVersion({
        modelName: args.input.modelName,
        version: args.input.version,
        namespace: args.input.namespace,
        image: args.input.image,
        requestedBy: ctx.user?.id,
      });
    },
  },
};
