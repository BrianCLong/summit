import { describe, test, expect, beforeAll, beforeEach, jest } from '@jest/globals';

// VIRTUAL MOCK for external dependencies
jest.mock('html-to-text', () => ({
    htmlToText: (html: string) => html,
}), { virtual: true });

const getSegmentStateMock = jest.fn();
const updateSegmentStateMock = jest.fn();
const detectCascadesMock = jest.fn();
const detectNarrativeConflictsMock = jest.fn();
const listActiveCampaignsMock = jest.fn();

jest.unstable_mockModule('../../cognitive-security/index.js', () => ({
  getClaimsService: () => ({
    detectNarrativeConflicts: detectNarrativeConflictsMock,
    getClaim: (id: string) =>
      Promise.resolve({
        id,
        canonicalText: `Text for ${id}`,
        sourceType: 'SOCIAL_MEDIA',
      }),
    getNarrative: (id: string) =>
      Promise.resolve({
        id,
        name: 'Mock Narrative',
      }),
    getNarrativeGraph: () =>
      Promise.resolve({
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

describe('Cognitive Security GraphQL Resolvers', () => {
    let cognitiveSecurityResolvers: any;

    beforeAll(async () => {
        ({ default: cognitiveSecurityResolvers } = await import('../resolvers/cognitive-security.js'));
    });

    beforeEach(() => {
        jest.clearAllMocks();

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

    test('Query: audienceCognitiveProfile', async () => {
        const profile = await (cognitiveSecurityResolvers.Query as any).audienceCognitiveProfile(
            {},
            { id: 'aud-1' }
        );

        expect(getSegmentStateMock).toHaveBeenCalledWith('aud-1');
        expect(profile).toMatchObject({
            id: 'aud-1',
            name: 'Tech Enthusiasts',
            resilienceScore: 0.75,
        });
    });

    test('Query: influencePathways', async () => {
        const pathways = await (cognitiveSecurityResolvers.Query as any).influencePathways(
            {},
            { narrativeId: 'narr-1' }
        );

        expect(detectCascadesMock).toHaveBeenCalledWith('narr-1');
        expect(pathways[0]).toMatchObject({
            id: 'cascade-1',
            totalHops: 5,
        });
    });

    test('Mutation: recordCognitiveEffect', async () => {
        const snapshot = await (cognitiveSecurityResolvers.Mutation as any).recordCognitiveEffect(
            {},
            { exposure: { segmentId: 'aud-1', narrativeId: 'narr-1', sentimentShift: -0.05 } }
        );

        expect(updateSegmentStateMock).toHaveBeenCalledWith('aud-1', 'narr-1', -0.05, 0.8);
        expect(snapshot).toMatchObject({
            segmentId: 'aud-1',
            resilienceScore: 0.75,
            emotionalValence: -0.05,
        });
    });

    test('Query: narrativeConflicts', async () => {
        const conflicts = await (cognitiveSecurityResolvers.Query as any).narrativeConflicts(
            {},
            { narrativeId: 'narr-1' }
        );
        const first = conflicts[0];
        const pairPromises = await (cognitiveSecurityResolvers.NarrativeConflict as any).contradictingClaims(first);
        const contradictingClaims = await Promise.all(pairPromises);

        expect(detectNarrativeConflictsMock).toHaveBeenCalledWith('narr-1');
        expect(first).toMatchObject({
            competingNarrativeId: 'narr-2',
            conflictScore: 0.8,
        });
        expect(contradictingClaims[0]).toMatchObject({
            claim1: { id: 'claim-1' },
            claim2: { id: 'claim-2' },
        });
    });
});
