import { factGovRepo } from './repo.js';
import { factGovService } from './service.js';

export const factGovResolvers = {
  Query: {
    factgovGetRfp: async (_: any, { id }: { id: string }) => {
      return await factGovRepo.getRfp(id);
    },
    factgovGetVendor: async (_: any, { id }: { id: string }) => {
      return await factGovRepo.getVendor(id);
    },
    factgovGetMatches: async (_: any, { rfpId }: { rfpId: string }) => {
      return await factGovRepo.getMatchesForRfp(rfpId);
    }
  },
  Mutation: {
    factgovCreateAgency: async (_: any, { name, domain }: { name: string, domain: string }) => {
      return await factGovRepo.createAgency(name, domain);
    },
    factgovCreateVendor: async (_: any, { name, tags, description }: { name: string, tags: string[], description?: string }) => {
      return await factGovRepo.createVendor(name, tags, description);
    },
    factgovCreateRfp: async (_: any, { agencyId, title, content }: { agencyId: string, title: string, content: string }, context: any) => {
      const rfp = await factGovRepo.createRfp(agencyId, title, content);
      const userId = context.user?.id || 'system';
      await factGovService.auditAction('RFP', rfp.id, 'CREATE', userId, { title });
      return rfp;
    },
    factgovMatchRfp: async (_: any, { rfpId }: { rfpId: string }) => {
      return await factGovService.matchRfp(rfpId);
    }
  }
};
