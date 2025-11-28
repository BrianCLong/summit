import { Signal, GeolocationResult, Emitter } from './types.js';

export class GeolocationService {
  private static instance: GeolocationService;

  private constructor() {}

  public static getInstance(): GeolocationService {
    if (!GeolocationService.instance) {
      GeolocationService.instance = new GeolocationService();
    }
    return GeolocationService.instance;
  }

  /**
   * Estimates direction of arrival (DOA/DF).
   * Returns a bearing in degrees [0-360).
   */
  public calculateDirectionFinding(signal: Signal, sensorLocation: { lat: number; lon: number }): number {
    // Simulate DF capabilities
    // In a real system, this takes inputs from an antenna array (interferometry, pseudo-doppler, etc.)
    // Here we generate a pseudo-random bearing seeded by signal ID or deterministic random

    // Hash signal ID to get consistent bearing for same signal ID
    let hash = 0;
    for (let i = 0; i < signal.id.length; i++) {
        hash = ((hash << 5) - hash) + signal.id.charCodeAt(i);
        hash |= 0;
    }
    const bearing = Math.abs(hash % 360);
    return bearing;
  }

  /**
   * Geolocation using TDOA (Time Difference of Arrival) simulation.
   * Requires multiple "sensors" in simulation logic.
   */
  public performGeolocation(signal: Signal, sensorReadings: Array<{ lat: number; lon: number; toa: number }>): GeolocationResult {
    // Basic simulation: if we have "readings", triangulate.
    // Otherwise, generate a plausible location near a target region (e.g., specific conflict zone).

    // Simulating a result:
    const baseLat = 34.5; // Arbitrary base (e.g., near Mediterranean/Middle East)
    const baseLon = 36.5;

    const jitterLat = (Math.random() - 0.5) * 0.1;
    const jitterLon = (Math.random() - 0.5) * 0.1;

    return {
        latitude: baseLat + jitterLat,
        longitude: baseLon + jitterLon,
        altitude: Math.random() * 1000,
        accuracy: 50 + Math.random() * 450, // 50-500m accuracy
        method: 'TDOA'
    };
  }
}
