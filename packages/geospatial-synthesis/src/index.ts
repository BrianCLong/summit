/**
 * @intelgraph/geospatial-synthesis
 * Geospatial data synthesis
 */

export interface GeoPoint {
  latitude: number;
  longitude: number;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

export interface GeoTrace {
  points: GeoPoint[];
  userId?: string;
  metadata?: Record<string, any>;
}

export interface POI {
  id: string;
  name: string;
  location: GeoPoint;
  category: string;
  attributes?: Record<string, any>;
}

export interface GeoSynthesisConfig {
  bounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
  privacyRadius?: number;
  numPoints?: number;
}

export class GeospatialSynthesizer {
  constructor(private config: GeoSynthesisConfig) {}

  /**
   * Generate location traces with privacy preservation
   */
  generateTraces(numTraces: number, pointsPerTrace: number): GeoTrace[] {
    const traces: GeoTrace[] = [];

    for (let i = 0; i < numTraces; i++) {
      const startPoint = this.generateRandomPoint();
      const points = this.generateTrace(startPoint, pointsPerTrace);

      traces.push({
        points,
        userId: `user_${i}`,
        metadata: { synthetic: true }
      });
    }

    return traces;
  }

  /**
   * Generate Points of Interest
   */
  generatePOIs(numPOIs: number): POI[] {
    const categories = ['restaurant', 'shop', 'park', 'office', 'school', 'hospital'];

    return Array.from({ length: numPOIs }, (_, i) => ({
      id: `poi_${i}`,
      name: `Location ${i}`,
      location: this.generateRandomPoint(),
      category: categories[Math.floor(Math.random() * categories.length)],
      attributes: { capacity: Math.floor(Math.random() * 100) + 10 }
    }));
  }

  /**
   * Apply geo-indistinguishability (privacy-preserving location perturbation)
   */
  applyGeoIndistinguishability(point: GeoPoint, epsilon: number): GeoPoint {
    // Add Laplace noise to coordinates
    const scale = 1 / epsilon;
    const latNoise = this.sampleLaplace(scale);
    const lonNoise = this.sampleLaplace(scale);

    return {
      latitude: this.clamp(point.latitude + latNoise, this.config.bounds.minLat, this.config.bounds.maxLat),
      longitude: this.clamp(point.longitude + lonNoise, this.config.bounds.minLon, this.config.bounds.maxLon),
      timestamp: point.timestamp,
      metadata: { ...point.metadata, privatized: true }
    };
  }

  /**
   * Generate mobility patterns
   */
  generateMobilityPattern(startPoint: GeoPoint, duration: number, speed: number): GeoTrace {
    const points: GeoPoint[] = [startPoint];
    const timeStep = 60000; // 1 minute
    const steps = Math.floor(duration / timeStep);

    let currentPoint = startPoint;

    for (let i = 1; i < steps; i++) {
      // Random walk with inertia
      const bearing = Math.random() * 2 * Math.PI;
      const distance = speed * (timeStep / 1000 / 3600); // km

      currentPoint = this.movePoint(currentPoint, distance, bearing);
      currentPoint.timestamp = new Date(startPoint.timestamp!.getTime() + i * timeStep);

      points.push(currentPoint);
    }

    return { points };
  }

  /**
   * Cluster points to create population distribution
   */
  generatePopulationDistribution(numClusters: number, pointsPerCluster: number): GeoPoint[] {
    const points: GeoPoint[] = [];
    const clusterCenters = Array.from({ length: numClusters }, () => this.generateRandomPoint());

    clusterCenters.forEach(center => {
      for (let i = 0; i < pointsPerCluster; i++) {
        // Generate point near cluster center
        const angle = Math.random() * 2 * Math.PI;
        const radius = Math.random() * 0.05; // ~5km radius

        const point = {
          latitude: center.latitude + radius * Math.cos(angle),
          longitude: center.longitude + radius * Math.sin(angle)
        };

        points.push(point);
      }
    });

    return points;
  }

  // Helper methods

  private generateRandomPoint(): GeoPoint {
    const { minLat, maxLat, minLon, maxLon } = this.config.bounds;

    return {
      latitude: minLat + Math.random() * (maxLat - minLat),
      longitude: minLon + Math.random() * (maxLon - minLon),
      timestamp: new Date()
    };
  }

  private generateTrace(start: GeoPoint, numPoints: number): GeoPoint[] {
    const points: GeoPoint[] = [start];
    let current = start;

    for (let i = 1; i < numPoints; i++) {
      // Random walk
      const latDelta = (Math.random() - 0.5) * 0.01;
      const lonDelta = (Math.random() - 0.5) * 0.01;

      current = {
        latitude: this.clamp(current.latitude + latDelta, this.config.bounds.minLat, this.config.bounds.maxLat),
        longitude: this.clamp(current.longitude + lonDelta, this.config.bounds.minLon, this.config.bounds.maxLon),
        timestamp: new Date(current.timestamp!.getTime() + 60000) // 1 minute apart
      };

      points.push(current);
    }

    return points;
  }

  private movePoint(point: GeoPoint, distanceKm: number, bearing: number): GeoPoint {
    const R = 6371; // Earth radius in km
    const lat1 = point.latitude * Math.PI / 180;
    const lon1 = point.longitude * Math.PI / 180;

    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(distanceKm / R) +
      Math.cos(lat1) * Math.sin(distanceKm / R) * Math.cos(bearing)
    );

    const lon2 = lon1 + Math.atan2(
      Math.sin(bearing) * Math.sin(distanceKm / R) * Math.cos(lat1),
      Math.cos(distanceKm / R) - Math.sin(lat1) * Math.sin(lat2)
    );

    return {
      latitude: lat2 * 180 / Math.PI,
      longitude: lon2 * 180 / Math.PI,
      timestamp: point.timestamp
    };
  }

  private sampleLaplace(scale: number): number {
    const u = Math.random() - 0.5;
    return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}

export default GeospatialSynthesizer;
