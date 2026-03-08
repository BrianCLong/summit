"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// VIRTUAL MOCK for external dependencies
globals_1.jest.mock('html-to-text', () => ({
    htmlToText: (html) => html,
}), { virtual: true });
const getSegmentStateMock = globals_1.jest.fn();
const updateSegmentStateMock = globals_1.jest.fn();
const detectCascadesMock = globals_1.jest.fn();
const detectNarrativeConflictsMock = globals_1.jest.fn();
const listActiveCampaignsMock = globals_1.jest.fn();
globals_1.jest.unstable_mockModule('../../cognitive-security/index.js', () => ({
    getClaimsService: () => ({
        detectNarrativeConflicts: detectNarrativeConflictsMock,
        getClaim: (id) => Promise.resolve({
            id,
            canonicalText: `Text for ${id}`,
            sourceType: 'SOCIAL_MEDIA',
        }),
        getNarrative: (id) => Promise.resolve({
            id,
            name: 'Mock Narrative',
        }),
        getNarrativeGraph: () => Promise.resolve({
            narrative: { id: 'narr-1', name: 'Mock Narrative' },
        }),
        getActor: () => Promise.resolve(null),
    }),
    getCampaignDetectionService: () => ({
        listActiveCampaigns: listActiveCampaignsMock,
    }),
    getResponseOpsService: () => ({}),
    getGovernanceService: () => ({}),
    getEvaluationService: () => ({}),
    getProvenanceService: () => ({}),
    CognitiveStateService: {
        getInstance: () => ({
            getSegmentState: getSegmentStateMock,
            updateSegmentState: updateSegmentStateMock,
        }),
    },
    CascadeDetectionService: {
        getInstance: () => ({
            detectCascades: detectCascadesMock,
        }),
    },
}));
(0, globals_1.describe)('Cognitive Security GraphQL Resolvers', () => {
    let cognitiveSecurityResolvers;
    (0, globals_1.beforeAll)(async () => {
        ({ default: cognitiveSecurityResolvers } = await Promise.resolve().then(() => __importStar(require('../resolvers/cognitive-security.js'))));
    });
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        listActiveCampaignsMock.mockResolvedValue([]);
        getSegmentStateMock.mockResolvedValue({
            id: 'aud-1',
            name: 'Tech Enthusiasts',
            resilienceScore: 0.75,
            trustInInstitutions: 0.8,
            identityClusters: ['innovators', 'optimists'],
            emotionalValence: -0.05,
        });
        updateSegmentStateMock.mockResolvedValue(undefined);
        detectCascadesMock.mockResolvedValue([{
                id: 'cascade-1',
                totalHops: 5,
                uniqueActors: 120,
                viralityScore: 0.6,
            }]);
        detectNarrativeConflictsMock.mockResolvedValue([{
                competingNarrativeId: 'narr-2',
                conflictScore: 0.8,
                contradictingClaimPairs: [['claim-1', 'claim-2']],
            }]);
    });
    (0, globals_1.test)('Query: audienceCognitiveProfile', async () => {
        const profile = await cognitiveSecurityResolvers.Query.audienceCognitiveProfile({}, { id: 'aud-1' });
        (0, globals_1.expect)(getSegmentStateMock).toHaveBeenCalledWith('aud-1');
        (0, globals_1.expect)(profile).toMatchObject({
            id: 'aud-1',
            name: 'Tech Enthusiasts',
            resilienceScore: 0.75,
        });
    });
    (0, globals_1.test)('Query: influencePathways', async () => {
        const pathways = await cognitiveSecurityResolvers.Query.influencePathways({}, { narrativeId: 'narr-1' });
        (0, globals_1.expect)(detectCascadesMock).toHaveBeenCalledWith('narr-1');
        (0, globals_1.expect)(pathways[0]).toMatchObject({
            id: 'cascade-1',
            totalHops: 5,
        });
    });
    (0, globals_1.test)('Mutation: recordCognitiveEffect', async () => {
        const snapshot = await cognitiveSecurityResolvers.Mutation.recordCognitiveEffect({}, { exposure: { segmentId: 'aud-1', narrativeId: 'narr-1', sentimentShift: -0.05 } });
        (0, globals_1.expect)(updateSegmentStateMock).toHaveBeenCalledWith('aud-1', 'narr-1', -0.05, 0.8);
        (0, globals_1.expect)(snapshot).toMatchObject({
            segmentId: 'aud-1',
            resilienceScore: 0.75,
            emotionalValence: -0.05,
        });
    });
    (0, globals_1.test)('Query: narrativeConflicts', async () => {
        const conflicts = await cognitiveSecurityResolvers.Query.narrativeConflicts({}, { narrativeId: 'narr-1' });
        const first = conflicts[0];
        const pairPromises = await cognitiveSecurityResolvers.NarrativeConflict.contradictingClaims(first);
        const contradictingClaims = await Promise.all(pairPromises);
        (0, globals_1.expect)(detectNarrativeConflictsMock).toHaveBeenCalledWith('narr-1');
        (0, globals_1.expect)(first).toMatchObject({
            competingNarrativeId: 'narr-2',
            conflictScore: 0.8,
        });
        (0, globals_1.expect)(contradictingClaims[0]).toMatchObject({
            claim1: { id: 'claim-1' },
            claim2: { id: 'claim-2' },
        });
    });
});
