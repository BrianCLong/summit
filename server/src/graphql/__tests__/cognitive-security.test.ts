import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals';

jest.mock('html-to-text', () => ({
    htmlToText: (html: string) => html,
}), { virtual: true });

import request from 'supertest';
import { createApp } from '../../app.js';

import { CognitiveStateService } from '../../services/CognitiveStateService.js';
import { CascadeDetectionService } from '../../services/CascadeDetectionService.js';
import { getClaimsService } from '../../cognitive-security/index.js';

describe('Cognitive Security GraphQL Integration', () => {
    let app: any;
    const authToken = 'test-token';

    beforeAll(async () => {
        app = await createApp();
    });

    describe('Query: audienceCognitiveProfile', () => {
        test('should return audience segment cognitive state', async () => {
            const mockSegment = {
                id: 'aud-1',
                name: 'Tech Enthusiasts',
                description: 'Early adopters of new technology',
                size: 5000,
                resilienceScore: 0.75,
                trustInInstitutions: 0.8,
                polarizationIndex: 0.2,
                fearSensitivity: 0.3,
                identityClusters: ['innovators', 'optimists'],
                narrativeIds: ['narr-1'],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            jest.spyOn(CognitiveStateService.getInstance(), 'getSegmentState').mockResolvedValue(mockSegment);

            const query = `
        query GetAudienceProfile($id: ID!) {
          audienceCognitiveProfile(id: $id) {
            id
            name
            resilienceScore
            trustInInstitutions
            identityClusters
          }
        }
      `;

            const response = await request(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    query,
                    variables: { id: 'aud-1' }
                })
                .expect(200);

            expect(response.body.data.audienceCognitiveProfile).toMatchObject({
                id: 'aud-1',
                name: 'Tech Enthusiasts',
                resilienceScore: 0.75,
                trustInInstitutions: 0.8,
                identityClusters: ['innovators', 'optimists']
            });
        });
    });

    describe('Query: influencePathways', () => {
        test('should return narrative cascades', async () => {
            const mockCascades = [
                {
                    id: 'cascade-1',
                    narrativeId: 'narr-1',
                    startTime: new Date().toISOString(),
                    originNodeId: 'actor-1',
                    totalHops: 5,
                    maxDepth: 3,
                    uniqueActors: 120,
                    velocity: 0.8,
                    viralityScore: 0.6,
                    hopIds: []
                }
            ];

            jest.spyOn(CascadeDetectionService.getInstance(), 'detectCascades').mockResolvedValue(mockCascades as any);

            const query = `
        query GetInfluencePathways($narrativeId: ID!) {
          influencePathways(narrativeId: $narrativeId) {
            id
            totalHops
            uniqueActors
            viralityScore
          }
        }
      `;

            const response = await request(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    query,
                    variables: { narrativeId: 'narr-1' }
                })
                .expect(200);

            expect(response.body.data.influencePathways).toHaveLength(1);
            expect(response.body.data.influencePathways[0]).toMatchObject({
                id: 'cascade-1',
                totalHops: 5,
                uniqueActors: 120
            });
        });
    });

    describe('Mutation: recordCognitiveEffect', () => {
        test('should record exposure and return updated state', async () => {
            const mockUpdatedSegment = {
                id: 'aud-1',
                resilienceScore: 0.72,
                trustInInstitutions: 0.78
            };

            jest.spyOn(CognitiveStateService.getInstance(), 'updateSegmentState').mockResolvedValue();
            jest.spyOn(CognitiveStateService.getInstance(), 'getSegmentState').mockResolvedValue(mockUpdatedSegment as any);

            const mutation = `
        mutation RecordEffect($exposure: CognitiveExposureInput!) {
          recordCognitiveEffect(exposure: $exposure) {
            id
            resilienceScore
            emotionalValence
          }
        }
      `;

            const response = await request(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    query: mutation,
                    variables: {
                        exposure: {
                            segmentId: 'aud-1',
                            narrativeId: 'narr-1',
                            sentimentShift: -0.05
                        }
                    }
                })
                .expect(200);

            expect(response.body.data.recordCognitiveEffect).toMatchObject({
                resilienceScore: 0.72,
                emotionalValence: -0.05
            });
        });
    });

    describe('Query: narrativeConflicts', () => {
        test('should return narrative conflicts', async () => {
            const mockConflicts = [
                {
                    competingNarrativeId: 'narr-2',
                    conflictScore: 0.8,
                    contradictingClaimPairs: [['claim-1', 'claim-2']]
                }
            ];

            const claimsService = getClaimsService();
            jest.spyOn(claimsService as any, 'detectNarrativeConflicts').mockResolvedValue(mockConflicts);

            // Also need to mock getClaim for the type resolver
            jest.spyOn(claimsService, 'getClaim').mockImplementation((id) => Promise.resolve({
                id,
                canonicalText: `Text for ${id}`,
                sourceType: 'SOCIAL_MEDIA',
                language: 'en'
            } as any));

            const query = `
        query GetNarrativeConflicts($narrativeId: ID!) {
          narrativeConflicts(narrativeId: $narrativeId) {
            competingNarrativeId
            conflictScore
            contradictingClaims {
              claim1 { id }
              claim2 { id }
            }
          }
        }
      `;

            const response = await request(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    query,
                    variables: { narrativeId: 'narr-1' }
                })
                .expect(200);

            expect(response.body.data.narrativeConflicts).toHaveLength(1);
            expect(response.body.data.narrativeConflicts[0]).toMatchObject({
                competingNarrativeId: 'narr-2',
                conflictScore: 0.8
            });
            expect(response.body.data.narrativeConflicts[0].contradictingClaims[0].claim1.id).toBe('claim-1');
        });
    });
});
