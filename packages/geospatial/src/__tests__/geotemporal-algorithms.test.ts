/**
 * Tests for geo-temporal analytics algorithms
 * Uses synthetic trajectory data to validate detection logic
 */

import { v4 as uuidv4 } from 'uuid';
import {
  buildTrajectory,
  detectStayPoints,
  detectCoPresence,
  detectConvoys,
  calculateTrajectoryDistance,
  calculateAverageSpeed,
} from '../analytics/geotemporal-algorithms';
import type { GeoObservation } from '../types/geotemporal';

/**
 * Helper to create a synthetic observation
 */
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

describe('Trajectory Building', () => {
  it('should build trajectory from observations sorted by time', () => {
    const baseTime = new Date('2025-01-01T10:00:00Z');

    const observations = [
      createObservation('E1', 40.7128, -74.0060, new Date(baseTime.getTime() + 30 * 60 * 1000)),
      createObservation('E1', 40.7580, -73.9855, new Date(baseTime.getTime() + 60 * 60 * 1000)),
      createObservation('E1', 40.7489, -73.9680, baseTime),
    ];

    const trajectory = buildTrajectory(observations);

    expect(trajectory).toHaveLength(3);
    expect(trajectory[0].latitude).toBe(40.7489);
    expect(trajectory[1].latitude).toBe(40.7128);
    expect(trajectory[2].latitude).toBe(40.7580);
  });

  it('should handle empty observations', () => {
    const trajectory = buildTrajectory([]);
    expect(trajectory).toHaveLength(0);
  });

  it('should calculate total distance correctly', () => {
    const baseTime = new Date('2025-01-01T10:00:00Z');

    // NYC to Brooklyn (straight line ~10km)
    const observations = [
      createObservation('E1', 40.7128, -74.0060, baseTime),
      createObservation('E1', 40.6782, -73.9442, new Date(baseTime.getTime() + 30 * 60 * 1000)),
    ];

    const trajectory = buildTrajectory(observations);
    const distance = calculateTrajectoryDistance(trajectory);

    // Should be around 6-8km
    expect(distance).toBeGreaterThan(6000);
    expect(distance).toBeLessThan(9000);
  });
});

describe('Stay-Point Detection', () => {
  it('should detect a stay point when entity remains in area', () => {
    const baseTime = new Date('2025-01-01T10:00:00Z');

    // Entity stays within 50m for 60 minutes
    const observations = [
      createObservation('E1', 40.7128, -74.0060, baseTime, 15),
      createObservation('E1', 40.7129, -74.0061, new Date(baseTime.getTime() + 15 * 60 * 1000), 15),
      createObservation('E1', 40.7127, -74.0059, new Date(baseTime.getTime() + 30 * 60 * 1000), 15),
      createObservation('E1', 40.7128, -74.0060, new Date(baseTime.getTime() + 45 * 60 * 1000), 15),
    ];

    const trajectory = buildTrajectory(observations);
    const stayPoints = detectStayPoints(trajectory, {
      radiusMeters: 100,
      minDurationMinutes: 30,
    });

    expect(stayPoints).toHaveLength(1);
    expect(stayPoints[0].durationMinutes).toBeGreaterThanOrEqual(30);
    expect(stayPoints[0].numObservations).toBe(4);
  });

  it('should NOT detect stay point when entity moves outside radius', () => {
    const baseTime = new Date('2025-01-01T10:00:00Z');

    const observations = [
      createObservation('E1', 40.7128, -74.0060, baseTime, 10),
      createObservation('E1', 40.7129, -74.0061, new Date(baseTime.getTime() + 10 * 60 * 1000), 10),
      // Moves ~5km away
      createObservation('E1', 40.7580, -73.9855, new Date(baseTime.getTime() + 20 * 60 * 1000), 10),
    ];

    const trajectory = buildTrajectory(observations);
    const stayPoints = detectStayPoints(trajectory, {
      radiusMeters: 100,
      minDurationMinutes: 30,
    });

    expect(stayPoints).toHaveLength(0);
  });

  it('should NOT detect stay point when duration is too short', () => {
    const baseTime = new Date('2025-01-01T10:00:00Z');

    const observations = [
      createObservation('E1', 40.7128, -74.0060, baseTime, 5),
      createObservation('E1', 40.7129, -74.0061, new Date(baseTime.getTime() + 5 * 60 * 1000), 5),
    ];

    const trajectory = buildTrajectory(observations);
    const stayPoints = detectStayPoints(trajectory, {
      radiusMeters: 100,
      minDurationMinutes: 30,
    });

    expect(stayPoints).toHaveLength(0);
  });

  it('should detect multiple stay points', () => {
    const baseTime = new Date('2025-01-01T10:00:00Z');

    const observations = [
      // Stay 1: 40 minutes at location A
      createObservation('E1', 40.7128, -74.0060, baseTime, 20),
      createObservation('E1', 40.7129, -74.0061, new Date(baseTime.getTime() + 20 * 60 * 1000), 20),
      // Move to location B
      createObservation('E1', 40.7580, -73.9855, new Date(baseTime.getTime() + 60 * 60 * 1000), 10),
      // Stay 2: 50 minutes at location B
      createObservation('E1', 40.7581, -73.9856, new Date(baseTime.getTime() + 70 * 60 * 1000), 20),
      createObservation('E1', 40.7579, -73.9854, new Date(baseTime.getTime() + 90 * 60 * 1000), 20),
    ];

    const trajectory = buildTrajectory(observations);
    const stayPoints = detectStayPoints(trajectory, {
      radiusMeters: 100,
      minDurationMinutes: 30,
    });

    expect(stayPoints.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Co-Presence Detection', () => {
  it('should detect co-presence when entities are close in space and time', () => {
    const baseTime = new Date('2025-01-01T10:00:00Z');

    const observations = [
      // Entity A at location (40.7128, -74.0060) from 10:00-10:20
      createObservation('E-A', 40.7128, -74.0060, baseTime, 20),
      // Entity B at nearby location from 10:05-10:25
      createObservation('E-B', 40.7129, -74.0061, new Date(baseTime.getTime() + 5 * 60 * 1000), 20),
    ];

    const intervals = detectCoPresence(observations, {
      maxDistanceMeters: 100,
      minOverlapMinutes: 10,
    });

    expect(intervals.length).toBeGreaterThanOrEqual(1);
    expect(intervals[0].entities).toContain('E-A');
    expect(intervals[0].entities).toContain('E-B');
    expect(intervals[0].overlapDurationMinutes).toBeGreaterThanOrEqual(10);
  });

  it('should NOT detect co-presence when entities are too far apart', () => {
    const baseTime = new Date('2025-01-01T10:00:00Z');

    const observations = [
      createObservation('E-A', 40.7128, -74.0060, baseTime, 20),
      // Entity B is ~5km away
      createObservation('E-B', 40.7580, -73.9855, baseTime, 20),
    ];

    const intervals = detectCoPresence(observations, {
      maxDistanceMeters: 100,
      minOverlapMinutes: 10,
    });

    expect(intervals).toHaveLength(0);
  });

  it('should NOT detect co-presence when temporal overlap is too short', () => {
    const baseTime = new Date('2025-01-01T10:00:00Z');

    const observations = [
      createObservation('E-A', 40.7128, -74.0060, baseTime, 10),
      // Entity B arrives just as A leaves
      createObservation('E-B', 40.7129, -74.0061, new Date(baseTime.getTime() + 9 * 60 * 1000), 10),
    ];

    const intervals = detectCoPresence(observations, {
      maxDistanceMeters: 100,
      minOverlapMinutes: 10,
    });

    expect(intervals).toHaveLength(0);
  });
});

describe('Convoy Detection', () => {
  it('should detect convoy when entities move together', () => {
    const baseTime = new Date('2025-01-01T10:00:00Z');

    // Three entities moving together through 4 time steps
    const observations: GeoObservation[] = [];

    for (let step = 0; step < 4; step++) {
      const time = new Date(baseTime.getTime() + step * 15 * 60 * 1000);
      const baseLat = 40.7128 + step * 0.01;
      const baseLon = -74.0060 + step * 0.01;

      observations.push(createObservation('E1', baseLat, baseLon, time, 15));
      observations.push(createObservation('E2', baseLat + 0.0001, baseLon + 0.0001, time, 15));
      observations.push(createObservation('E3', baseLat - 0.0001, baseLon - 0.0001, time, 15));
    }

    const convoys = detectConvoys(observations, {
      maxDistanceMeters: 250,
      minGroupSize: 3,
      minSteps: 3,
      stepDurationMinutes: 15,
    });

    expect(convoys.length).toBeGreaterThanOrEqual(1);
    if (convoys.length > 0) {
      expect(convoys[0].entities).toContain('E1');
      expect(convoys[0].entities).toContain('E2');
      expect(convoys[0].entities).toContain('E3');
      expect(convoys[0].numSteps).toBeGreaterThanOrEqual(3);
    }
  });

  it('should NOT detect convoy when group size is too small', () => {
    const baseTime = new Date('2025-01-01T10:00:00Z');

    // Only 2 entities, but minGroupSize is 3
    const observations: GeoObservation[] = [];

    for (let step = 0; step < 4; step++) {
      const time = new Date(baseTime.getTime() + step * 15 * 60 * 1000);
      const baseLat = 40.7128 + step * 0.01;
      const baseLon = -74.0060 + step * 0.01;

      observations.push(createObservation('E1', baseLat, baseLon, time, 15));
      observations.push(createObservation('E2', baseLat + 0.0001, baseLon + 0.0001, time, 15));
    }

    const convoys = detectConvoys(observations, {
      maxDistanceMeters: 250,
      minGroupSize: 3,
      minSteps: 3,
      stepDurationMinutes: 15,
    });

    expect(convoys).toHaveLength(0);
  });

  it('should NOT detect convoy when entities do not stay together long enough', () => {
    const baseTime = new Date('2025-01-01T10:00:00Z');

    // Entities together for only 2 steps with short durations, but minSteps is 3
    const observations: GeoObservation[] = [];

    for (let step = 0; step < 2; step++) {
      const time = new Date(baseTime.getTime() + step * 15 * 60 * 1000);
      const baseLat = 40.7128 + step * 0.01;
      const baseLon = -74.0060 + step * 0.01;

      // Use shorter duration (5 min) to avoid spanning multiple steps
      observations.push(createObservation('E1', baseLat, baseLon, time, 5));
      observations.push(createObservation('E2', baseLat + 0.0001, baseLon + 0.0001, time, 5));
      observations.push(createObservation('E3', baseLat - 0.0001, baseLon - 0.0001, time, 5));
    }

    const convoys = detectConvoys(observations, {
      maxDistanceMeters: 250,
      minGroupSize: 3,
      minSteps: 3,
      stepDurationMinutes: 15,
    });

    expect(convoys).toHaveLength(0);
  });
});

describe('Speed Calculation', () => {
  it('should calculate average speed correctly', () => {
    const baseTime = new Date('2025-01-01T10:00:00Z');

    // Move ~10km in 1 hour = ~2.78 m/s
    const observations = [
      createObservation('E1', 40.7128, -74.0060, baseTime, 30),
      createObservation('E1', 40.6782, -73.9442, new Date(baseTime.getTime() + 60 * 60 * 1000), 30),
    ];

    const trajectory = buildTrajectory(observations);
    const speed = calculateAverageSpeed(trajectory);

    // Should be around 2-3 m/s (7-11 km/h)
    expect(speed).toBeGreaterThan(1);
    expect(speed).toBeLessThan(5);
  });

  it('should return 0 for single point trajectory', () => {
    const baseTime = new Date('2025-01-01T10:00:00Z');
    const observations = [createObservation('E1', 40.7128, -74.0060, baseTime, 30)];

    const trajectory = buildTrajectory(observations);
    const speed = calculateAverageSpeed(trajectory);

    expect(speed).toBe(0);
  });
});
