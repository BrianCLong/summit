import baseLogger from '../../config/logger';
import { TenantValidator } from '../../middleware/tenantValidator.js';
import {
  getGraphValidationService,
  GraphValidationPayload,
  GraphValidationService,
} from '../../graph/validation/index.js';

const logger = baseLogger.child({ name: 'graphValidationResolver' });

type GraphValidationInput = {
  tenantId: string;
  nodes: Array<{ id: string; labels: string[]; properties: Record<string, unknown> }>;
  relationships: Array<{
    id?: string;
    type: string;
    sourceId: string;
    targetId: string;
    properties?: Record<string, unknown>;
  }>;
};

type ResolverContext = {
  user?: { id: string; tenantId?: string; roles?: string[] };
  graphValidationService?: GraphValidationService;
  [key: string]: unknown;
};

export const graphValidationResolvers = {
  Mutation: {
    async validateGraphData(
      _parent: unknown,
      { input }: { input: GraphValidationInput },
      context: ResolverContext,
    ) {
      const service = context.graphValidationService ?? getGraphValidationService();
      const tenantContext = TenantValidator.validateTenantAccess(context, input.tenantId, {
        requireExplicitTenant: true,
        validateOwnership: true,
      });

      const payload: GraphValidationPayload = {
        tenantId: tenantContext.tenantId,
        nodes: input.nodes ?? [],
        relationships: input.relationships ?? [],
      };

      const result = await service.validate(payload);

      logger.info(
        {
          tenantId: tenantContext.tenantId,
          valid: result.valid,
          errors: result.errors.length,
          warnings: result.warnings.length,
        },
        'Graph data validation executed',
      );

      return {
        valid: result.valid,
        errors: result.errors,
        warnings: result.warnings,
        appliedRules: result.appliedRules,
      };
    },
  },
};

export default graphValidationResolvers;
