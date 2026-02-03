
import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { InfluenceOperationsEngine } from '../InfluenceOperationsEngine.js';
import { BehavioralAnalyzer } from '../BehavioralAnalyzer.js';
import { Driver } from 'neo4j-driver';
import { SocialPost, Actor } from '../types.js';

// Mock types
const mockRun = jest.fn();
const mockClose = jest.fn();
const mockSession = jest.fn(() => ({
  run: mockRun,
  close: mockClose,
}));

const mockDriver = {
  session: mockSession,
} as unknown as Driver;

describe('InfluenceOperationsEngine', () => {
    let engine: InfluenceOperationsEngine;

    beforeEach(() => {
        mockRun.mockClear();
        jest.restoreAllMocks();
        jest.spyOn(BehavioralAnalyzer.prototype, 'detectBot').mockReturnValue({
          isAnomalous: true,
          score: 1,
          reason: 'bot fingerprint',
        });
        jest
          .spyOn(BehavioralAnalyzer.prototype, 'detectTemporalCoordination')
          .mockReturnValue({
            isAnomalous: true,
            score: 0.9,
            reason: 'temporal spike',
          });
        jest
          .spyOn(BehavioralAnalyzer.prototype, 'detectGeoTemporalAnomalies')
          .mockReturnValue({
            isAnomalous: false,
            score: 0,
            reason: 'normal',
          });
        engine = new InfluenceOperationsEngine(mockDriver);
        jest
          .spyOn((engine as any).graphDetector, 'detectCoordinatedCliques')
          .mockResolvedValue({
            isAnomalous: true,
            score: 0.9,
            reason: 'mocked clique density',
          });
    });

    it('should detect campaigns', async () => {
        // Setup data for coordinated botnet
        const now = new Date();
        const actors: Actor[] = [];
        const posts: SocialPost[] = [];

        for(let i=0; i<6; i++) {
            actors.push({
                id: `bot${i}`,
                username: `bot${i}`,
                platform: 'x',
                createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24), // 1 day old
                metadata: {}
            });
            // High frequency posting
            for(let j=0; j<60; j++) {
                 posts.push({
                    id: `p_${i}_${j}`,
                    content: `Coordinated message ${j}`,
                    authorId: `bot${i}`,
                    timestamp: new Date(now.getTime() - j * 1000), // 1 sec apart
                    platform: 'x',
                    metadata: {}
                 });
            }
        }

        // Mock Graph Response for the bots
        mockRun.mockResolvedValueOnce({
            records: [
              {
                get: (key: string) => {
                  if (key === 'internalInteractions') return { toNumber: () => 30 };
                  if (key === 'actorCount') return { toNumber: () => 6 };
                  return null;
                }
              }
            ]
          });

        const campaigns = await engine.detectCampaigns(posts, actors);

        // Should find temporal coordination or botnet activity
        expect(campaigns.length).toBeGreaterThan(0);
        const botnetCampaign = campaigns.find(c => c.type === 'COORDINATED_INAUTHENTIC_BEHAVIOR');
        expect(botnetCampaign).toBeDefined();
        expect(botnetCampaign?.threatLevel).toBe('HIGH');
    });
});
