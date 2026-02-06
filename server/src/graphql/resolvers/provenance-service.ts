import { gql } from 'graphql-tag';
import { ProvenanceClaimService } from '../../services/ProvenanceClaimService.js';

export const provenanceResolvers = {
  Mutation: {
    registerEvidence: async (_: any, args: any, context: any) => {
      const { input } = args;
      return ProvenanceClaimService.getInstance().registerEvidence({
        ...input,
        registered_by: context.user?.id || 'system',
        tenant_id: context.user?.tenantId || 'default'
      });
    },
    registerClaim: async (_: any, args: any, context: any) => {
      const { input } = args;
      return ProvenanceClaimService.getInstance().registerClaim({
        ...input,
        created_by: context.user?.id || 'system',
        tenant_id: context.user?.tenantId || 'default'
      });
    },
    linkClaimToEvidence: async (_: any, args: any, context: any) => {
      const { input } = args;
      return ProvenanceClaimService.getInstance().linkClaimToEvidence({
        ...input,
        created_by: context.user?.id || 'system',
        tenant_id: context.user?.tenantId || 'default'
      });
    },
    createExportManifest: async (_: any, args: any, context: any) => {
      const { input } = args;
      return ProvenanceClaimService.getInstance().createExportManifest({
        ...input,
        created_by: context.user?.id || 'system',
        tenant_id: context.user?.tenantId || 'default'
      });
    }
  },
  Query: {
    // Basic queries would be implemented here or generated via DataSources
  }
};
