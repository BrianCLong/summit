import { getDatasetLineage, LineageDirection } from '../../db/repositories/lineage';
import logger from '../../config/logger.js';

const lineageLogger = logger.child({ module: 'lineage-resolver' });

interface DataLineageArgs {
  dataset: string;
  tenantId?: string;
  direction?: LineageDirection;
}

export const lineageResolvers = {
  Query: {
    async dataLineage(_: unknown, args: DataLineageArgs) {
      if (!args.dataset) {
        throw new Error('dataset is required');
      }

      try {
        return await getDatasetLineage(args.dataset, {
          tenantId: args.tenantId,
          direction: args.direction,
        });
      } catch (error) {
        lineageLogger.error({
          error: (error as Error).message,
          dataset: args.dataset,
        }, 'failed to resolve dataLineage');
        throw new Error('Failed to load lineage information');
      }
    },
  },
};

export default lineageResolvers;
