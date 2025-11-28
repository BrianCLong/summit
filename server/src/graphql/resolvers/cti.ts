import { threatHuntingService } from '../../services/threatHuntingService';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const STIXImportService = require('../../services/STIXImportService.js');
import { getNeo4jDriver, getPostgresPool } from '../../config/database'; // Assuming these exist

// Instantiate STIXImportService lazily or here if deps are available
// Note: In a real app, we might use dependency injection or context
const getStixService = () => {
    // Basic instantiation for now. SocketIO is optional in the service so passing null.
    // In production, we'd want to pass the real socket server.
    return new STIXImportService(getNeo4jDriver(), getPostgresPool(), null);
};

export const ctiResolvers = {
  Query: {
    threatActor: (_: any, { id }: { id: string }) => {
      return threatHuntingService.getThreatActor(id);
    },
    threatActors: (_: any, { limit }: { limit?: number }) => {
      return threatHuntingService.getThreatActors().slice(0, limit || 10);
    },
    malware: (_: any, { id }: { id: string }) => {
      return threatHuntingService.getMalware(id);
    },
    malwareList: (_: any, { limit }: { limit?: number }) => {
      return threatHuntingService.getMalwareList().slice(0, limit || 10);
    },
    ioc: (_: any, { id }: { id: string }) => {
      const iocs = threatHuntingService.getIOCs();
      return iocs.find(i => i.id === id);
    },
    iocs: (_: any, { type, severity, limit }: { type?: any, severity?: any, limit?: number }) => {
      return threatHuntingService.getIOCs({ type, severity }).slice(0, limit || 20);
    },
    threatHunt: (_: any, { id }: { id: string }) => {
       const hunts = threatHuntingService.getThreatHunts();
       return hunts.find(h => h.id === id);
    },
    threatHunts: (_: any, { status }: { status?: any }) => {
      return threatHuntingService.getThreatHunts(status);
    },

    // Advanced Analysis
    analyzeDiamondModel: (_: any, { actorId }: { actorId: string }) => {
      return threatHuntingService.analyzeDiamondModel(actorId);
    },
    analyzeAttackChain: (_: any, { incidentId }: { incidentId: string }) => {
      return threatHuntingService.analyzeAttackChain(incidentId);
    },
    getThreatScore: (_: any, { entityId }: { entityId: string }) => {
      return threatHuntingService.getThreatScore(entityId);
    }
  },

  Mutation: {
    createThreatHunt: async (_: any, args: any, context: any) => {
      const user = context.user ? context.user.id : 'unknown';
      return await threatHuntingService.createThreatHunt(args, user);
    },

    importTaxiiCollection: async (_: any, { taxiiUrl, collectionId }: { taxiiUrl: string, collectionId: string }, context: any) => {
        const service = getStixService();
        return await service.startTaxiiImport({
            taxiiUrl,
            collectionId,
            investigationId: 'default', // Or pass as arg
            userId: context.user?.id || 'system',
            tenantId: context.user?.tenantId || 'default'
        });
    },

    importStixBundle: async (_: any, { bundleJson }: { bundleJson: any }, context: any) => {
        const service = getStixService();
        return await service.startStixJsonImport({
            bundleJson,
            investigationId: 'default',
            userId: context.user?.id || 'system',
            tenantId: context.user?.tenantId || 'default'
        });
    }
  }
};
