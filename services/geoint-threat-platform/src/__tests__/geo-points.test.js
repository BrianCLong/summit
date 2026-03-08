"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const repository_js_1 = require("../neo4j/repository.js");
class StubSession {
    points;
    constructor(points) {
        this.points = points;
    }
    async run() {
        return {
            records: this.points.map((point) => ({
                get: (key) => (key === 'point' ? point : undefined),
            })),
            summary: {
                counters: {
                    updates: () => ({ nodesCreated: 0, propertiesSet: 0, relationshipsCreated: 0 }),
                },
            },
        };
    }
    async close() { }
}
class StubDriver {
    points;
    constructor(points) {
        this.points = points;
    }
    session() {
        return new StubSession(this.points);
    }
}
(0, vitest_1.describe)('GEOINTNeo4jRepository.getGeoPointsByBBox', () => {
    (0, vitest_1.it)('returns deterministically ordered points within bbox', async () => {
        const unorderedPoints = [
            { id: 'b', latitude: 10, longitude: -70, type: 'THREAT_ACTOR', name: 'Zulu' },
            { id: 'a', latitude: 5, longitude: -80, type: 'THREAT_ACTOR', name: 'Alpha' },
            { id: 'c', latitude: 5, longitude: -70, type: 'THREAT_ACTOR', name: 'Bravo' },
        ];
        const repository = new repository_js_1.GEOINTNeo4jRepository(new StubDriver(unorderedPoints));
        const result = await repository.getGeoPointsByBBox({ minLon: -180, minLat: -90, maxLon: 180, maxLat: 90 }, { limit: 10, offset: 0 });
        (0, vitest_1.expect)(result.data.map((p) => p.id)).toEqual(['a', 'c', 'b']);
        (0, vitest_1.expect)(result.data.map((p) => [p.latitude, p.longitude])).toEqual([
            [5, -80],
            [5, -70],
            [10, -70],
        ]);
        (0, vitest_1.expect)(result.metrics.cacheHit).toBe(false);
    });
});
