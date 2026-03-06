/**
 * Mock client for Blackbird.AI Narrative Feed
 */
export class BlackbirdClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getFeed(since?: Date): Promise<any[]> {
    // Mock response
    return [
      {
        id: 'bb-' + Math.random().toString(36).substring(7),
        narrative: 'Deepfake CEO scandal',
        risk_score: 85,
        actors: ['BotNet-A', 'User-X'],
        platforms: ['Twitter', 'Telegram'],
        topics: ['finance', 'fraud'],
        timestamp: new Date().toISOString()
      }
    ];
  }
}
