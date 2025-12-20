import { describe, expect, it } from 'vitest';

import { GEOINTNeo4jRepository } from '../neo4j/repository.js';

class StubSession {
  constructor(private points: Array<Record<string, unknown>>) {}

  async run() {
    return {
      records: this.points.map((point) => ({
        get: (key: string) => (key === 'point' ? point : undefined),
      })),
      summary: {
        counters: {
          updates: () => ({ nodesCreated: 0, propertiesSet: 0, relationshipsCreated: 0 }),
        },
      },
    };
  }

  async close() {}
}

class StubDriver {
  constructor(private points: Array<Record<string, unknown>>) {}
  session() {
    return new StubSession(this.points);
  }
}

describe('GEOINTNeo4jRepository.getGeoPointsByBBox', () => {
  it('returns deterministically ordered points within bbox', async () => {
    const unorderedPoints = [
      { id: 'b', latitude: 10, longitude: -70, type: 'THREAT_ACTOR', name: 'Zulu' },
      { id: 'a', latitude: 5, longitude: -80, type: 'THREAT_ACTOR', name: 'Alpha' },
      { id: 'c', latitude: 5, longitude: -70, type: 'THREAT_ACTOR', name: 'Bravo' },
    ];

    const repository = new GEOINTNeo4jRepository(new StubDriver(unorderedPoints) as any);
    const result = await repository.getGeoPointsByBBox(
      { minLon: -180, minLat: -90, maxLon: 180, maxLat: 90 },
      { limit: 10, offset: 0 },
    );

    expect(result.data.map((p) => p.id)).toEqual(['a', 'c', 'b']);
    expect(result.data.map((p) => [p.latitude, p.longitude])).toEqual([
      [5, -80],
      [5, -70],
      [10, -70],
    ]);
    expect(result.metrics.cacheHit).toBe(false);
  });
});

