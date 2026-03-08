import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { GeospatialService, setPostgresPoolForTesting } from '../GeospatialService';

const mPool = {
  query: jest.fn(),
};

// Mock database config to avoid connection issues
jest.mock('../../config/database', () => ({
  getPostgresPool: jest.fn(() => mPool),
}));

describe('GeospatialService', () => {
  let geoService: GeospatialService;
  let mockPool: any;

  beforeEach(() => {
    jest.clearAllMocks();
    geoService = GeospatialService.getInstance();
    mockPool = mPool;
    setPostgresPoolForTesting(mockPool);
  });

  it('should add a location', async () => {
    const mockId = 'uuid-123';
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: mockId }] });

    const result = await geoService.addLocation({
      name: 'Test Location',
      latitude: 40.7128,
      longitude: -74.0060,
    });

    expect(result).toBe(mockId);
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO geo_locations'),
      ['Test Location', undefined, -74.0060, 40.7128, {}]
    );
  });

  it('should find nearby locations', async () => {
    const mockRows = [{ id: '1', name: 'Loc 1', distance: 100 }];
    mockPool.query.mockResolvedValueOnce({ rows: mockRows });

    const result = await geoService.findNearby(40.7128, -74.0060, 1000);

    expect(result).toEqual(mockRows);
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('ST_DWithin'),
      [-74.0060, 40.7128, 1000]
    );
  });

  it('should optimize route using nearest neighbor', () => {
    const stops = [
      { id: '1', lat: 0, lon: 0 },
      { id: '2', lat: 10, lon: 10 },
      { id: '3', lat: 1, lon: 1 },
    ];

    // Expected order: 1 -> 3 (dist ~1.4) -> 2 (dist ~12.7)
    // If we went 1 -> 2 -> 3, dist would be ~14 + ~12.7

    const optimized = geoService.optimizeRoute(stops);

    expect(optimized[0].id).toBe('1');
    expect(optimized[1].id).toBe('3');
    expect(optimized[2].id).toBe('2');
  });

  it('should cluster locations', async () => {
    const mockClusters = [{ point_count: 5, cluster_lon: 10, cluster_lat: 10 }];
    mockPool.query.mockResolvedValueOnce({ rows: mockClusters });

    const result = await geoService.clusterLocations(5);

    expect(result).toEqual(mockClusters);
    expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ST_SnapToGrid'),
        expect.any(Array)
    );
  });
});
