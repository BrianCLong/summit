import baseLogger from '../../config/logger.js';
import CustomGraphMetricsService, {
  CustomMetricDefinition,
  CustomMetricResult,
} from '../../services/customGraphMetricsService.js';

const logger = baseLogger.child({ name: 'customGraphMetricsResolver' });

let service: CustomGraphMetricsService | null = null;

function getService() {
  if (!service) {
    service = new CustomGraphMetricsService();
  }
  return service;
}

export interface CustomGraphMetricRequestInput {
  tenantId?: string;
  investigationId?: string;
  metrics: CustomMetricDefinition[];
  useCache?: boolean;
}

interface ResolverContext {
  user?: {
    id: string;
    tenantId?: string;
  };
}

export function setCustomGraphMetricsService(instance: CustomGraphMetricsService) {
  service = instance;
}

export function resetCustomGraphMetricsService() {
  service = null;
}

export const customGraphMetricResolvers = {
  Query: {
    async customGraphMetrics(
      _parent: unknown,
      args: { input: CustomGraphMetricRequestInput },
      context: ResolverContext,
    ): Promise<CustomMetricResult[]> {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      const tenantId = args.input.tenantId ?? context.user.tenantId;
      if (!tenantId) {
        throw new Error('Tenant ID is required');
      }

      logger.info({
        tenantId,
        userId: context.user.id,
        investigationId: args.input.investigationId,
        metricCount: args.input.metrics?.length ?? 0,
      }, 'Executing custom graph metrics');

      return await getService().executeMetrics(args.input.metrics, {
        tenantId,
        investigationId: args.input.investigationId,
        useCache: args.input.useCache,
      });
    },

    customGraphMetricTemplates() {
      return getService().listTemplates();
    },
  },
};

export default customGraphMetricResolvers;
