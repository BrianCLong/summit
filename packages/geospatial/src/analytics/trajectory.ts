import { haversineDistance } from '../utils/distance.js';
import type { GeoPoint, MovementTrack } from '../types/geospatial.js';

export interface MovementStats {
  totalDistance: number;
  averageSpeed: number;
  stops: GeoPoint[];
  maxSpeed: number;
}

export const analyzeTrack = (track: MovementTrack, stopSpeedThreshold = 0.5, dwellTimeMs = 120000): MovementStats => {
  let totalDistance = 0;
  let totalTime = 0;
  let maxSpeed = 0;
  const stops: GeoPoint[] = [];

  for (let i = 1; i < track.points.length; i += 1) {
    const prev = track.points[i - 1];
    const current = track.points[i];
    const distance = haversineDistance(prev, current);
    const timeDelta = Math.max(1, (current.timestamp?.getTime() ?? 0) - (prev.timestamp?.getTime() ?? 0)) / 1000;
    const speed = distance / timeDelta;

    totalDistance += distance;
    totalTime += timeDelta;
    maxSpeed = Math.max(maxSpeed, speed);

    if (speed < stopSpeedThreshold && timeDelta * 1000 >= dwellTimeMs) {
      stops.push(current);
    }
  }

  return {
    totalDistance,
    averageSpeed: totalTime ? totalDistance / totalTime : 0,
    stops,
    maxSpeed,
  };
};
