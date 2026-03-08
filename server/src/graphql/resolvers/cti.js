"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ctiResolvers = void 0;
const threatHuntingService_js_1 = require("../../services/threatHuntingService.js");
const module_1 = require("module");
const database_js_1 = require("../../config/database.js"); // Assuming these exist
const require = (0, module_1.createRequire)(import.meta.url);
const STIXImportService = require('../../services/STIXImportService.js');
// Instantiate STIXImportService lazily or here if deps are available
// Note: In a real app, we might use dependency injection or context
const getStixService = () => {
    // Basic instantiation for now. SocketIO is optional in the service so passing null.
    // In production, we'd want to pass the real socket server.
    return new STIXImportService((0, database_js_1.getNeo4jDriver)(), (0, database_js_1.getPostgresPool)(), null);
};
exports.ctiResolvers = {
    Query: {
        threatActor: (_, { id }) => {
            return threatHuntingService_js_1.threatHuntingService.getThreatActor(id);
        },
        threatActors: (_, { limit }) => {
            return threatHuntingService_js_1.threatHuntingService.getThreatActors().slice(0, limit || 10);
        },
        malware: (_, { id }) => {
            return threatHuntingService_js_1.threatHuntingService.getMalware(id);
        },
        malwareList: (_, { limit }) => {
            return threatHuntingService_js_1.threatHuntingService.getMalwareList().slice(0, limit || 10);
        },
        ioc: (_, { id }) => {
            const iocs = threatHuntingService_js_1.threatHuntingService.getIOCs();
            return iocs.find(i => i.id === id);
        },
        iocs: (_, { type, severity, limit }) => {
            return threatHuntingService_js_1.threatHuntingService.getIOCs({ type, severity }).slice(0, limit || 20);
        },
        threatHunt: (_, { id }) => {
            const hunts = threatHuntingService_js_1.threatHuntingService.getThreatHunts();
            return hunts.find(h => h.id === id);
        },
        threatHunts: (_, { status }) => {
            return threatHuntingService_js_1.threatHuntingService.getThreatHunts(status);
        },
        // Advanced Analysis
        analyzeDiamondModel: (_, { actorId }) => {
            return threatHuntingService_js_1.threatHuntingService.analyzeDiamondModel(actorId);
        },
        analyzeAttackChain: (_, { incidentId }) => {
            return threatHuntingService_js_1.threatHuntingService.analyzeAttackChain(incidentId);
        },
        getThreatScore: (_, { entityId }) => {
            return threatHuntingService_js_1.threatHuntingService.getThreatScore(entityId);
        }
    },
    Mutation: {
        createThreatHunt: async (_, args, context) => {
            const user = context.user ? context.user.id : 'unknown';
            return await threatHuntingService_js_1.threatHuntingService.createThreatHunt(args, user);
        },
        importTaxiiCollection: async (_, { taxiiUrl, collectionId }, context) => {
            const service = getStixService();
            return await service.startTaxiiImport({
                taxiiUrl,
                collectionId,
                investigationId: 'default', // Or pass as arg
                userId: context.user?.id || 'system',
                tenantId: context.user?.tenantId || 'default'
            });
        },
        importStixBundle: async (_, { bundleJson }, context) => {
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
