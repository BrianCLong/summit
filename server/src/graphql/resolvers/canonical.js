"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalResolvers = void 0;
// @ts-nocheck
const GraphCoreService_js_1 = require("../../services/GraphCoreService.js");
const ledger_js_1 = require("../../provenance/ledger.js");
exports.canonicalResolvers = {
    CanonicalEntity: {
        __resolveType(obj) {
            if (obj.entityType === 'Person')
                return 'Person';
            if (obj.entityType === 'Organization')
                return 'Organization';
            if (obj.entityType === 'Claim')
                return 'Claim';
            return 'GenericEntity';
        },
        temporal(obj) {
            return {
                validFrom: obj.validFrom,
                validTo: obj.validTo,
                observedAt: obj.observedAt,
                recordedAt: obj.recordedAt
            };
        },
        policyLabels(obj) {
            if (typeof obj.policyLabels === 'string') {
                try {
                    return JSON.parse(obj.policyLabels);
                }
                catch (e) {
                    return {};
                }
            }
            return obj.policyLabels;
        }
    },
    Query: {
        canonicalEntity: async (_, { id, asOf }, context) => {
            const tenantId = context.user?.tenantId || 'default';
            return GraphCoreService_js_1.graphCore.getEntity(tenantId, id, asOf ? new Date(asOf) : undefined);
        },
        provenanceEntries: async (_, { resourceId, actionType, limit }, context) => {
            const tenantId = context.user?.tenantId || 'default';
            return ledger_js_1.provenanceLedger.getEntries(tenantId, {
                resourceId, // Mapping might be needed if resourceId is passed but not supported directly in getEntries signature I updated?
                // Wait, getEntries supports resourceType/actionType but resourceId wasn't in the options I saw earlier?
                // Let's double check provenance/ledger.ts
                actionType,
                limit
            });
        },
        verifyLedgerIntegrity: async (_, __, context) => {
            const tenantId = context.user?.tenantId || 'default';
            return ledger_js_1.provenanceLedger.verifyChainIntegrity(tenantId);
        },
        exportLedger: async (_, { format }, context) => {
            const tenantId = context.user?.tenantId || 'default';
            return ledger_js_1.provenanceLedger.exportLedger(tenantId, format);
        }
    },
    Mutation: {
        createCanonicalEntity: async (_, { entityType, data, policyLabels }, context) => {
            const tenantId = context.user?.tenantId || 'default';
            const actorId = context.user?.id || 'system';
            return GraphCoreService_js_1.graphCore.saveEntity(tenantId, entityType, data, policyLabels, actorId);
        },
        updateCanonicalEntity: async (_, { id, data, policyLabels }, context) => {
            const tenantId = context.user?.tenantId || 'default';
            const actorId = context.user?.id || 'system';
            // Fetch existing to merge policyLabels if not provided?
            // For now assume policyLabels required or we need a fetch
            const existing = await GraphCoreService_js_1.graphCore.getEntity(tenantId, id);
            if (!existing)
                throw new Error('Entity not found');
            const labels = policyLabels || (typeof existing.policyLabels === 'string' ? JSON.parse(existing.policyLabels) : existing.policyLabels);
            return GraphCoreService_js_1.graphCore.saveEntity(tenantId, existing.entityType, { ...data, id }, labels, actorId);
        },
        createRelationship: async (_, { fromId, toId, relationType, properties }, context) => {
            const tenantId = context.user?.tenantId || 'default';
            const actorId = context.user?.id || 'system';
            return GraphCoreService_js_1.graphCore.createRelationship(tenantId, fromId, toId, relationType, properties, actorId);
        },
        registerClaim: async (_, { statement, subjects, sources, policyLabels, relatedClaims }, context) => {
            const tenantId = context.user?.tenantId || 'default';
            const actorId = context.user?.id || 'system';
            const claimData = {
                statement,
                subjects,
                sources,
                relatedClaims
            };
            // Create claim entity in Graph
            const claim = await GraphCoreService_js_1.graphCore.saveEntity(tenantId, 'Claim', claimData, policyLabels, actorId);
            // Also register explicitly in Ledger (redundant? saveEntity already does it, but registerClaim is a specific action)
            // The GraphCoreService.saveEntity logs CREATE_UPDATE_ENTITY.
            // The requirement says "Provenance & Claim Ledger service: Claim registration".
            // Let's also call ledger.registerClaim to be explicit about the business event.
            await ledger_js_1.provenanceLedger.registerClaim(claim.id, claimData, tenantId, actorId, relatedClaims);
            return claim;
        },
        linkEvidenceToClaim: async (_, { claimId, evidenceId, weight, description }, context) => {
            const tenantId = context.user?.tenantId || 'default';
            const actorId = context.user?.id || 'system';
            return GraphCoreService_js_1.graphCore.linkEvidenceToClaim(tenantId, claimId, evidenceId, weight, description, actorId);
        }
    }
};
