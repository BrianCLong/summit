import { describe, it, expect, vi } from 'vitest';
import { BlackbirdIntel } from '../../src/connectors/cis/plugins/blackbird/mapper';

// Mock the client
vi.mock('../../src/connectors/cis/plugins/blackbird/client', () => {
  return {
    BlackbirdClient: vi.fn(function() {
      return {
        getFeed: vi.fn().mockResolvedValue([
          {
            id: 'bb-fixture-456',
            narrative: 'Deepfake CEO scandal',
            risk_score: 85,
            actors: ['BotNet-A', 'User-X'],
            platforms: ['Twitter', 'Telegram'],
            topics: ['finance', 'fraud'],
            timestamp: '2023-10-27T10:00:00Z'
          }
        ])
      };
    })
  };
});

describe('BlackbirdIntel', () => {
  it('should map feed items to NarrativeItems', async () => {
    const intel = new BlackbirdIntel('mock-key');
    const result = await intel.fetchFeed();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      narrative_id: 'bb-fixture-456',
      summary: 'Deepfake CEO scandal',
      topics: ['finance', 'fraud'],
      actors: ['BotNet-A', 'User-X'],
      channels: ['Twitter', 'Telegram'],
      risk_score: 0.85,
      provider: 'Blackbird',
      evidence_ids: []
    });
  });
});
