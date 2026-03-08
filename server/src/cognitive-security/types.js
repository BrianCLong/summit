"use strict";
/**
 * Cognitive Security Operations - Type Definitions
 *
 * Core types for the defensive cognitive security system including:
 * - Claim Graph model (claims → evidence → narratives → actors → channels)
 * - C2PA/Content Credentials provenance
 * - Campaign detection signals
 * - Response operations artifacts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClaim = createClaim;
exports.createEvidence = createEvidence;
exports.createNarrative = createNarrative;
exports.createCampaign = createCampaign;
const crypto_1 = require("crypto");
// ============================================================================
// Helper Functions
// ============================================================================
function createClaim(canonicalText, sourceType, language = 'en') {
    const now = new Date().toISOString();
    return {
        id: (0, crypto_1.randomUUID)(),
        canonicalText,
        language,
        sourceType,
        firstObservedAt: now,
        lastObservedAt: now,
        verdict: 'UNVERIFIED',
        verdictConfidence: 0,
        evidenceIds: [],
        relatedClaimIds: [],
        narrativeIds: [],
        actorIds: [],
        channelIds: [],
        entities: [],
        metadata: {},
        createdAt: now,
        updatedAt: now,
    };
}
function createEvidence(type, title, content) {
    const now = new Date().toISOString();
    return {
        id: (0, crypto_1.randomUUID)(),
        type,
        title,
        content,
        sourceCredibility: 0.5,
        claimIds: [],
        supportsVerdict: 'UNVERIFIED',
        verified: false,
        capturedAt: now,
        createdAt: now,
        metadata: {},
    };
}
function createNarrative(name, description) {
    const now = new Date().toISOString();
    return {
        id: (0, crypto_1.randomUUID)(),
        name,
        description,
        summary: description,
        status: 'EMERGING',
        firstDetectedAt: now,
        claimIds: [],
        childNarrativeIds: [],
        actorIds: [],
        channelIds: [],
        audienceIds: [],
        keywords: [],
        velocity: {
            spreadRate: 0,
            acceleration: 0,
            estimatedReach: 0,
            platformCount: 0,
            languageCount: 1,
            regions: [],
        },
        createdAt: now,
        updatedAt: now,
    };
}
function createCampaign(name, threatLevel) {
    const now = new Date().toISOString();
    return {
        id: (0, crypto_1.randomUUID)(),
        name,
        description: '',
        threatLevel,
        status: 'SUSPECTED',
        firstDetectedAt: now,
        lastActivityAt: now,
        narrativeIds: [],
        actorIds: [],
        channelIds: [],
        coordinationSignalIds: [],
        claimIds: [],
        targetAudienceIds: [],
        ttps: [],
        attributionConfidence: 0,
        responsePlaybookIds: [],
        createdAt: now,
        updatedAt: now,
        metrics: {
            totalClaims: 0,
            totalActors: 0,
            totalChannels: 0,
            estimatedReach: 0,
            platformSpread: 0,
            languageCount: 0,
            coordinationScore: 0,
            velocity: 0,
            engagementRate: 0,
        },
    };
}
