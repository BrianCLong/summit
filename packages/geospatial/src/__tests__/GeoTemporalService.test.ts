/**
 * Integration tests for GeoTemporalService
 * Uses in-memory repository to test service logic
 */

import { v4 as uuidv4 } from 'uuid';
import { InMemoryGeoGraphRepository } from '../repository/GeoGraphRepository';
import { GeoTemporalService } from '../services/GeoTemporalService';
import type { GeoObservation } from '../types/geotemporal';

function createObservation(
  entityId: string,
  lat: number,
  lon: number,
  startTime: Date,
  durationMinutes: number = 10,
): GeoObservation {
  const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

  return {
    id: uuidv4(),
    entityId,
    entityType: 'PERSON',
    location: {
      id: uuidv4(),
      latitude: lat,
      longitude: lon,
    },
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    confidence: 0.9,
    tags: [],
  };
}

describe('GeoTemporalService', () => {
  let repository: InMemoryGeoGraphRepository;
  let service: GeoTemporalService;

  beforeEach(() => {
    repository = new InMemoryGeoGraphRepository();
    service = new GeoTemporalService(repository);
  });

  describe('getTrajectory', () => {
    it('should return trajectory for entity', async () => {
      const baseTime = new Date('2025-01-01T10:00:00Z');

      await repository.batchUpsertObservations([
        createObservation('E1', 40.7128, -74.0060, baseTime, 10),
        createObservation('E1', 40.7580, -73.9855, new Date(baseTime.getTime() + 30 * 60 * 1000), 10),
      ]);

      const trajectory = await service.getTrajectory('E1');

      expect(trajectory).toHaveLength(2);
      expect(trajectory[0].latitude).toBe(40.7128);
    });

    it('should filter trajectory by time range', async () => {
      const baseTime = new Date('2025-01-01T10:00:00Z');

      await repository.batchUpsertObservations([
        createObservation('E1', 40.7128, -74.0060, baseTime, 10),
        createObservation('E1', 40.7580, -73.9855, new Date(baseTime.getTime() + 30 * 60 * 1000), 10),
        createObservation('E1', 40.7489, -73.9680, new Date(baseTime.getTime() + 120 * 60 * 1000), 10),
      ]);

      const trajectory = await service.getTrajectory('E1', {
        from: baseTime.toISOString(),
        to: new Date(baseTime.getTime() + 60 * 60 * 1000).toISOString(),
      });

      expect(trajectory).toHaveLength(2);
    });
  });

  describe('getTrajectoryAnalysis', () => {
    it('should return trajectory with computed metrics', async () => {
      const baseTime = new Date('2025-01-01T10:00:00Z');

      await repository.batchUpsertObservations([
        createObservation('E1', 40.7128, -74.0060, baseTime, 30),
        createObservation('E1', 40.6782, -73.9442, new Date(baseTime.getTime() + 60 * 60 * 1000), 30),
      ]);

      const analysis = await service.getTrajectoryAnalysis('E1');

      expect(analysis.entityId).toBe('E1');
      expect(analysis.totalDistanceMeters).toBeGreaterThan(0);
      expect(analysis.averageSpeedMetersPerSecond).toBeGreaterThan(0);
      expect(analysis.points).toHaveLength(2);
    });

    it('should throw error when no data exists', async () => {
      await expect(service.getTrajectoryAnalysis('NONEXISTENT')).rejects.toThrow(
        'No trajectory data found',
      );
    });
  });

  describe('getStayPoints', () => {
    it('should detect stay points', async () => {
      const baseTime = new Date('2025-01-01T10:00:00Z');

      await repository.batchUpsertObservations([
        createObservation('E1', 40.7128, -74.0060, baseTime, 15),
        createObservation('E1', 40.7129, -74.0061, new Date(baseTime.getTime() + 15 * 60 * 1000), 15),
        createObservation('E1', 40.7127, -74.0059, new Date(baseTime.getTime() + 30 * 60 * 1000), 15),
      ]);

      const stayPoints = await service.getStayPoints(
        'E1',
        {
          from: baseTime.toISOString(),
          to: new Date(baseTime.getTime() + 60 * 60 * 1000).toISOString(),
        },
        {
          radiusMeters: 100,
          minDurationMinutes: 30,
        },
      );

      expect(stayPoints.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getCoPresence', () => {
    it('should detect co-presence between entities', async () => {
      const baseTime = new Date('2025-01-01T10:00:00Z');

      await repository.batchUpsertObservations([
        createObservation('E-A', 40.7128, -74.0060, baseTime, 20),
        createObservation('E-B', 40.7129, -74.0061, new Date(baseTime.getTime() + 5 * 60 * 1000), 20),
      ]);

      const intervals = await service.getCoPresence(
        ['E-A', 'E-B'],
        {
          from: baseTime.toISOString(),
          to: new Date(baseTime.getTime() + 60 * 60 * 1000).toISOString(),
        },
        {
          maxDistanceMeters: 100,
          minOverlapMinutes: 10,
        },
      );

      expect(intervals.length).toBeGreaterThanOrEqual(1);
    });

    it('should enforce entity limit', async () => {
      const entityIds = Array.from({ length: 150 }, (_, i) => `E${i}`);

      await expect(
        service.getCoPresence(
          entityIds,
          {
            from: '2025-01-01T00:00:00Z',
            to: '2025-01-01T01:00:00Z',
          },
          {
            maxDistanceMeters: 100,
            minOverlapMinutes: 10,
          },
        ),
      ).rejects.toThrow('exceeds limit');
    });

    it('should validate time range', async () => {
      await expect(
        service.getCoPresence(
          ['E1', 'E2'],
          {
            from: '2025-01-01T01:00:00Z',
            to: '2025-01-01T00:00:00Z', // Invalid: to before from
          },
          {
            maxDistanceMeters: 100,
            minOverlapMinutes: 10,
          },
        ),
      ).rejects.toThrow('Invalid time range');
    });
  });

  describe('getConvoys', () => {
    it('should detect convoys', async () => {
      const baseTime = new Date('2025-01-01T10:00:00Z');
      const observations: GeoObservation[] = [];

      for (let step = 0; step < 4; step++) {
        const time = new Date(baseTime.getTime() + step * 15 * 60 * 1000);
        const baseLat = 40.7128 + step * 0.01;
        const baseLon = -74.0060 + step * 0.01;

        observations.push(createObservation('E1', baseLat, baseLon, time, 15));
        observations.push(createObservation('E2', baseLat + 0.0001, baseLon + 0.0001, time, 15));
        observations.push(createObservation('E3', baseLat - 0.0001, baseLon - 0.0001, time, 15));
      }

      await repository.batchUpsertObservations(observations);

      const convoys = await service.getConvoys(
        ['E1', 'E2', 'E3'],
        {
          from: baseTime.toISOString(),
          to: new Date(baseTime.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        },
        {
          maxDistanceMeters: 250,
          minGroupSize: 3,
          minSteps: 3,
          stepDurationMinutes: 15,
        },
      );

      expect(convoys.length).toBeGreaterThanOrEqual(1);
    });
  });
});
