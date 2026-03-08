"use strict";
/**
 * Cognitive Security GraphQL Resolvers
 *
 * Resolvers for the Cognitive Security Operations module.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cognitiveSecurityResolvers = void 0;
const graphql_1 = require("graphql");
const index_js_1 = require("../../cognitive-security/index.js");
// Helper to get services with error handling
const getServices = () => {
    try {
        return {
            claims: (0, index_js_1.getClaimsService)(),
            campaignDetection: (0, index_js_1.getCampaignDetectionService)(),
            responseOps: (0, index_js_1.getResponseOpsService)(),
            governance: (0, index_js_1.getGovernanceService)(),
            evaluation: (0, index_js_1.getEvaluationService)(),
            provenance: (0, index_js_1.getProvenanceService)(),
            cognitiveState: index_js_1.CognitiveStateService.getInstance(),
            cascadeDetection: index_js_1.CascadeDetectionService.getInstance(),
        };
    }
    catch (error) {
        throw new graphql_1.GraphQLError('Cognitive Security module not initialized', {
            extensions: { code: 'SERVICE_UNAVAILABLE' },
        });
    }
};
// ============================================================================
// Query Resolvers
// ============================================================================
const Query = {
    // Claims
    cogSecClaim: async (_, { id }) => {
        const { claims } = getServices();
        return claims.getClaim(id);
    },
    cogSecClaims: async (_, { filter, limit = 20, offset = 0, }) => {
        const { claims } = getServices();
        return claims.searchClaims(filter?.query || '', filter, limit);
    },
    searchCogSecClaims: async (_, { query, limit = 20 }) => {
        const { claims } = getServices();
        return claims.searchClaims(query, undefined, limit);
    },
    similarClaims: async (_, { claimId, threshold = 0.85 }) => {
        const { claims } = getServices();
        const claim = await claims.getClaim(claimId);
        if (!claim)
            return [];
        const similar = await claims.findSimilarClaims(claim, threshold);
        return similar.map((s) => s.claim);
    },
    // Evidence
    cogSecEvidence: async (_, { id }) => {
        // Would need to implement in claims service
        return null;
    },
    // Narratives
    cogSecNarrative: async (_, { id }) => {
        // Would need to implement in claims service
        return null;
    },
    narrativeGraph: async (_, { narrativeId }) => {
        const { claims } = getServices();
        return claims.getNarrativeGraph(narrativeId);
    },
    // Campaigns
    cogSecCampaign: async (_, { id }) => {
        const { campaignDetection } = getServices();
        return campaignDetection.getCampaign(id);
    },
    activeCampaigns: async (_, { limit = 20 }) => {
        const { campaignDetection } = getServices();
        return campaignDetection.listActiveCampaigns(limit);
    },
    campaignSignals: async (_, { campaignId }) => {
        const { campaignDetection } = getServices();
        return campaignDetection.getCampaignSignals(campaignId);
    },
    // Incidents
    cogSecIncident: async (_, { id }) => {
        // Would need to implement getter in responseOps
        return null;
    },
    // Playbooks
    responsePlaybook: async (_, { id }) => {
        // Would need to implement getter in responseOps
        return null;
    },
    // Governance
    cogSecAuditLogs: async (_, { resourceType, resourceId, limit = 100, }) => {
        const { governance } = getServices();
        return governance.queryAuditLogs({
            resourceType: resourceType,
            resourceId,
        }, limit);
    },
    pendingAppeals: async (_, { limit = 50 }) => {
        const { governance } = getServices();
        return governance.getPendingAppeals(limit);
    },
    governancePolicies: async () => {
        const { governance } = getServices();
        return governance.getAllPolicies();
    },
    transparencyReport: async (_, { startDate, endDate }) => {
        const { governance } = getServices();
        return governance.generateTransparencyReport(startDate, endDate);
    },
    // Metrics
    cogSecMetrics: async (_, { startDate, endDate }) => {
        const { evaluation } = getServices();
        return evaluation.calculateAllMetrics(startDate, endDate);
    },
    benchmarkComparison: async (_, { startDate, endDate }) => {
        const { evaluation } = getServices();
        const metrics = await evaluation.calculateAllMetrics(startDate, endDate);
        return evaluation.compareToBenchmarks(metrics);
    },
    riskAssessment: async () => {
        const { evaluation } = getServices();
        return evaluation.generateRiskAssessment();
    },
    // Content Credentials
    contentCredential: async (_, { id }) => {
        // Would need to implement retrieval
        return null;
    },
    // Cognitive Operations
    audienceCognitiveProfile: async (_, { id }) => {
        const { cognitiveState } = getServices();
        return cognitiveState.getSegmentState(id);
    },
    cognitiveRiskDashboard: async (_, { filters }) => {
        // Placeholder implementation
        return {
            averageResilience: 0.65,
            highRiskSegments: 3,
            topThreats: ['OVERLOAD', 'POLARIZATION_WEDGE']
        };
    },
    // Influence Pathways
    influencePathways: async (_, { narrativeId }) => {
        const { cascadeDetection } = getServices();
        return cascadeDetection.detectCascades(narrativeId);
    },
    narrativeConflicts: async (_, { narrativeId }) => {
        const { claims } = getServices();
        return claims.detectNarrativeConflicts(narrativeId);
    },
    narrativeEarlyWarnings: async (_, { watchlistId }) => {
        // Placeholder implementation
        return [];
    },
};
// ============================================================================
// Mutation Resolvers
// ============================================================================
const Mutation = {
    // Claims
    extractClaim: async (_, { input, }, context) => {
        const { claims, governance } = getServices();
        const claim = await claims.extractClaim(input.text, input.sourceType, input.sourceUrl, input.actorId, input.channelId);
        // Log audit
        await governance.logAudit('EXTRACT_CLAIM', 'CLAIM', claim.id, context.user?.id || 'system', {
            tenantId: context.tenantId,
            newState: { sourceType: input.sourceType },
        });
        return claim;
    },
    updateClaimVerdict: async (_, { input, }, context) => {
        const { claims, governance } = getServices();
        const claim = await claims.updateVerdict(input.claimId, input.verdict, input.confidence, input.evidenceIds, context.user?.id);
        await governance.logAudit('UPDATE_VERDICT', 'CLAIM', input.claimId, context.user?.id || 'system', {
            tenantId: context.tenantId,
            newState: { verdict: input.verdict, confidence: input.confidence },
        });
        return claim;
    },
    linkRelatedClaims: async (_, { claimId1, claimId2, relationType, }) => {
        const { claims } = getServices();
        await claims.linkRelatedClaims(claimId1, claimId2, relationType);
        return true;
    },
    // Evidence
    createEvidence: async (_, { input, }) => {
        const { claims } = getServices();
        return claims.createEvidence(input.type, input.title, input.content, {
            sourceUrl: input.sourceUrl,
            sourceCredibility: input.sourceCredibility,
            claimIds: input.claimIds,
            supportsVerdict: input.supportsVerdict,
        });
    },
    verifyEvidence: async (_, { evidenceId, notes }, context) => {
        const { claims } = getServices();
        return claims.verifyEvidence(evidenceId, context.user?.id || 'system', notes);
    },
    linkEvidenceToClaims: async (_, { evidenceId, claimIds }) => {
        const { claims } = getServices();
        await claims.linkEvidenceToClaims(evidenceId, claimIds);
        return true;
    },
    // Narratives
    createNarrative: async (_, { input, }) => {
        const { claims } = getServices();
        return claims.createNarrative(input.name, input.description, input.claimIds, input.keywords);
    },
    updateNarrativeStatus: async (_, { narrativeId, status }) => {
        const { claims } = getServices();
        return claims.updateNarrativeStatus(narrativeId, status);
    },
    linkClaimsToNarrative: async (_, { claimIds, narrativeId }) => {
        const { claims } = getServices();
        await claims.linkClaimsToNarrative(claimIds, narrativeId);
        return true;
    },
    // Campaigns
    runDetectionPipeline: async () => {
        const { campaignDetection } = getServices();
        return campaignDetection.runDetectionPipeline();
    },
    clusterIntoCampaigns: async () => {
        const { campaignDetection } = getServices();
        const signals = await campaignDetection.runDetectionPipeline();
        return campaignDetection.clusterIntoCampaigns(signals);
    },
    updateCampaignStatus: async (_, { campaignId, status }) => {
        const { campaignDetection } = getServices();
        return campaignDetection.updateCampaignStatus(campaignId, status);
    },
    // Incidents
    createIncident: async (_, { input, }) => {
        const { responseOps } = getServices();
        return responseOps.createIncident(input.campaignId, input.name, input.description, input.leadAnalystId, input.severity);
    },
    updateIncidentStatus: async (_, { incidentId, status }, context) => {
        const { responseOps } = getServices();
        return responseOps.updateIncidentStatus(incidentId, status, context.user?.id || 'system');
    },
    addIncidentTimelineEvent: async (_, { incidentId, type, description, }, context) => {
        const { responseOps } = getServices();
        return responseOps.addTimelineEvent(incidentId, type, description, context.user?.id);
    },
    // Playbooks
    generatePlaybook: async (_, { input, }, context) => {
        const { responseOps } = getServices();
        return responseOps.generatePlaybook(input.campaignId, context.user?.id || 'system', {
            priority: input.priority,
            assigneeId: input.assigneeId,
            dueAt: input.dueAt,
        });
    },
    executePlaybookAction: async (_, { playbookId, actionId }, context) => {
        const { responseOps } = getServices();
        return responseOps.executeAction(playbookId, actionId, context.user?.id || 'system');
    },
    updatePlaybookStatus: async (_, { playbookId, status }) => {
        const { responseOps } = getServices();
        return responseOps.updatePlaybookStatus(playbookId, status);
    },
    // Artifacts
    generateBriefing: async (_, { campaignId }, context) => {
        const { responseOps } = getServices();
        return responseOps.generateBriefing(campaignId, context.user?.id || 'system');
    },
    generateStakeholderMessage: async (_, { campaignId, stakeholder }, context) => {
        const { responseOps } = getServices();
        return responseOps.generateStakeholderMessage(campaignId, stakeholder, context.user?.id || 'system');
    },
    generateTakedownPacket: async (_, { input, }, context) => {
        const { responseOps } = getServices();
        return responseOps.generateTakedownPacket(input.campaignId, input.platform, input.urls, input.accountIds, input.violationType, context.user?.id || 'system', {
            legalBasis: input.legalBasis,
            contactInfo: input.contactInfo,
        });
    },
    // Appeals
    createAppeal: async (_, { input, }, context) => {
        const { governance, claims } = getServices();
        // Get current claim to get current verdict
        const claim = await claims.getClaim(input.claimId);
        if (!claim) {
            throw new graphql_1.GraphQLError('Claim not found', {
                extensions: { code: 'NOT_FOUND' },
            });
        }
        return governance.createAppeal(input.claimId, claim.verdict, input.requestedVerdict, context.user?.id || 'system', input.reason, input.supportingEvidence);
    },
    reviewAppeal: async (_, { appealId, decision, notes, }, context) => {
        const { governance } = getServices();
        return governance.reviewAppeal(appealId, context.user?.id || 'system', decision, notes);
    },
    // Content Credentials
    createContentCredential: async (_, { assetId, mimeType, sourceUrl, }) => {
        const { provenance } = getServices();
        // Would need to fetch asset content
        const content = Buffer.from('');
        return provenance.createContentCredential(assetId, content, mimeType, sourceUrl);
    },
    addProvenanceLink: async (_, { credentialId, source, platform, }) => {
        // Would need to retrieve credential first
        return null;
    },
    // Cognitive Operations
    recordCognitiveEffect: async (_, { exposure }) => {
        const { cognitiveState } = getServices();
        await cognitiveState.updateSegmentState(exposure.segmentId, exposure.narrativeId, exposure.sentimentShift || 0.1, // Heuristic strength
        0.8 // Certainty placeholder
        );
        // Fetch the updated state
        const segment = await cognitiveState.getSegmentState(exposure.segmentId);
        if (!segment)
            throw new graphql_1.GraphQLError('Segment not found after update');
        // Construct a snapshot state object
        return {
            id: `state-${exposure.segmentId}-${Date.now()}`,
            segmentId: exposure.segmentId,
            timestamp: new Date().toISOString(),
            beliefVector: {}, // In a real app, this would be computed
            resilienceScore: segment.resilienceScore,
            emotionalValence: exposure.sentimentShift || 0,
            arousalLevel: 0.5
        };
    },
};
// ============================================================================
// Subscription Resolvers
// ============================================================================
const Subscription = {
    campaignDetected: {
        subscribe: () => {
            // Would implement with pub/sub
            throw new graphql_1.GraphQLError('Not implemented');
        },
    },
    coordinationSignalDetected: {
        subscribe: () => {
            throw new graphql_1.GraphQLError('Not implemented');
        },
    },
    incidentUpdated: {
        subscribe: (_, { incidentId }) => {
            throw new graphql_1.GraphQLError('Not implemented');
        },
    },
    claimVerdictUpdated: {
        subscribe: (_, { narrativeId }) => {
            throw new graphql_1.GraphQLError('Not implemented');
        },
    },
    playbookActionCompleted: {
        subscribe: (_, { playbookId }) => {
            throw new graphql_1.GraphQLError('Not implemented');
        },
    },
};
// ============================================================================
// Type Resolvers
// ============================================================================
const CogSecClaim = {
    evidence: async (claim) => {
        // Would resolve from claims service
        return [];
    },
    relatedClaims: async (claim) => {
        return [];
    },
    narratives: async (claim) => {
        return [];
    },
    actors: async (claim) => {
        return [];
    },
    channels: async (claim) => {
        return [];
    },
};
const CogSecCampaign = {
    narratives: async (campaign) => {
        return [];
    },
    actors: async (campaign) => {
        return [];
    },
    channels: async (campaign) => {
        return [];
    },
    signals: async (campaign) => {
        const { campaignDetection } = getServices();
        return campaignDetection.getCampaignSignals(campaign.id);
    },
    claims: async (campaign) => {
        return [];
    },
    playbooks: async (campaign) => {
        return [];
    },
    incident: async (campaign) => {
        return null;
    },
};
const CogSecIncidentResolvers = {
    campaigns: async (incident) => {
        return [];
    },
    playbooks: async (incident) => {
        return [];
    },
    leadAnalyst: async (incident) => {
        return null;
    },
    investigation: async (incident) => {
        return null;
    },
};
const VerificationAppealResolvers = {
    claim: async (appeal) => {
        const { claims } = getServices();
        return claims.getClaim(appeal.claimId);
    },
    appellant: async (appeal) => {
        return null;
    },
    reviewer: async (appeal) => {
        return null;
    },
};
// ============================================================================
// Export
// ============================================================================
const AudienceSegmentResolvers = {
    cognitiveStates: async (segment) => {
        // This would typically query a history table. Returning current state as snapshot for now.
        return [{
                id: `current-${segment.id}`,
                segmentId: segment.id,
                timestamp: new Date().toISOString(),
                beliefVector: {},
                resilienceScore: segment.resilienceScore,
                emotionalValence: 0,
                arousalLevel: 0.5
            }];
    },
    targetedByCampaigns: async (segment) => {
        const { campaignDetection } = getServices();
        const campaigns = await campaignDetection.listActiveCampaigns(10);
        return campaigns.filter((c) => c.targetAudienceIds.includes(segment.id));
    }
};
const NarrativeCascadeResolvers = {
    narrative: async (cascade) => {
        const { claims } = getServices();
        return claims.getNarrativeGraph(cascade.narrativeId).then((g) => g.narrative);
    },
    originActor: async (cascade) => {
        if (!cascade.originActorId)
            return null;
        const { claims } = getServices();
        return claims.getActor(cascade.originActorId);
    }
};
const NarrativeConflict = {
    competingNarrative: async (conflict) => {
        const { claims } = getServices();
        return claims.getNarrative(conflict.competingNarrativeId);
    },
    contradictingClaims: async (conflict) => {
        const { claims } = getServices();
        return conflict.contradictingClaimPairs.map(async (pair) => {
            const [c1, c2] = await Promise.all([
                claims.getClaim(pair[0]),
                claims.getClaim(pair[1])
            ]);
            return { claim1: c1, claim2: c2 };
        });
    }
};
exports.cognitiveSecurityResolvers = {
    Query,
    Mutation,
    Subscription,
    CogSecClaim,
    CogSecCampaign,
    CogSecIncident: CogSecIncidentResolvers,
    VerificationAppeal: VerificationAppealResolvers,
    AudienceSegment: AudienceSegmentResolvers,
    NarrativeCascade: NarrativeCascadeResolvers,
    NarrativeConflict
};
exports.default = exports.cognitiveSecurityResolvers;
