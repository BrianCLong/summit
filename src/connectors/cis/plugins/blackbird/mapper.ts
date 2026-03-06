import { NarrativeIntel, NarrativeItem } from '../types';
import { BlackbirdClient } from './client';

export class BlackbirdIntel implements NarrativeIntel {
  id = 'blackbird-narrative-feed';
  name = 'Blackbird Narrative Feed';
  type = 'NarrativeIntel' as const;

  private client: BlackbirdClient;

  constructor(apiKey: string) {
    this.client = new BlackbirdClient(apiKey);
  }

  async initialize(): Promise<void> {
    // Auth check
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async fetchFeed(since?: Date): Promise<NarrativeItem[]> {
    const feed = await this.client.getFeed(since);

    return feed.map(item => ({
      narrative_id: item.id,
      summary: item.narrative,
      topics: item.topics,
      actors: item.actors,
      channels: item.platforms,
      risk_score: item.risk_score / 100,
      provider: 'Blackbird',
      evidence_ids: []
    }));
  }
}
