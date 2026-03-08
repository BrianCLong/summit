"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const GeospatialService_js_1 = require("../GeospatialService.js");
const mPool = {
    query: globals_1.jest.fn(),
};
// Mock database config to avoid connection issues
globals_1.jest.mock('../../config/database', () => ({
    getPostgresPool: globals_1.jest.fn(() => mPool),
}));
(0, globals_1.describe)('GeospatialService', () => {
    let geoService;
    let mockPool;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        geoService = GeospatialService_js_1.GeospatialService.getInstance();
        mockPool = mPool;
        (0, GeospatialService_js_1.setPostgresPoolForTesting)(mockPool);
    });
    (0, globals_1.it)('should add a location', async () => {
        const mockId = 'uuid-123';
        mockPool.query.mockResolvedValueOnce({ rows: [{ id: mockId }] });
        const result = await geoService.addLocation({
            name: 'Test Location',
            latitude: 40.7128,
            longitude: -74.0060,
        });
        (0, globals_1.expect)(result).toBe(mockId);
        (0, globals_1.expect)(mockPool.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('INSERT INTO geo_locations'), ['Test Location', undefined, -74.0060, 40.7128, {}]);
    });
    (0, globals_1.it)('should find nearby locations', async () => {
        const mockRows = [{ id: '1', name: 'Loc 1', distance: 100 }];
        mockPool.query.mockResolvedValueOnce({ rows: mockRows });
        const result = await geoService.findNearby(40.7128, -74.0060, 1000);
        (0, globals_1.expect)(result).toEqual(mockRows);
        (0, globals_1.expect)(mockPool.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('ST_DWithin'), [-74.0060, 40.7128, 1000]);
    });
    (0, globals_1.it)('should optimize route using nearest neighbor', () => {
        const stops = [
            { id: '1', lat: 0, lon: 0 },
            { id: '2', lat: 10, lon: 10 },
            { id: '3', lat: 1, lon: 1 },
        ];
        // Expected order: 1 -> 3 (dist ~1.4) -> 2 (dist ~12.7)
        // If we went 1 -> 2 -> 3, dist would be ~14 + ~12.7
        const optimized = geoService.optimizeRoute(stops);
        (0, globals_1.expect)(optimized[0].id).toBe('1');
        (0, globals_1.expect)(optimized[1].id).toBe('3');
        (0, globals_1.expect)(optimized[2].id).toBe('2');
    });
    (0, globals_1.it)('should cluster locations', async () => {
        const mockClusters = [{ point_count: 5, cluster_lon: 10, cluster_lat: 10 }];
        mockPool.query.mockResolvedValueOnce({ rows: mockClusters });
        const result = await geoService.clusterLocations(5);
        (0, globals_1.expect)(result).toEqual(mockClusters);
        (0, globals_1.expect)(mockPool.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('ST_SnapToGrid'), globals_1.expect.any(Array));
    });
});
