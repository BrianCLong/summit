import {
  AnomalyType,
  DetectionContext,
  Detector,
  AnomalyResult,
  Severity,
} from '../types.ts';

interface SpatialData {
  latitude: number;
  longitude: number;
  history?: Array<{ latitude: number; longitude: number }>;
  radiusKm?: number;
}

export class SpatialDetector implements Detector {
  type = AnomalyType.SPATIAL;
  private readonly EARTH_RADIUS_KM = 6371;

  async detect(context: DetectionContext): Promise<AnomalyResult> {
    const data = context.data as SpatialData;
    const { latitude, longitude, history = [], radiusKm = 100 } = data;

    if (history.length === 0) {
      return this.createResult(context, false, 0, Severity.LOW);
    }

    // Calculate centroid of history
    const center = this.calculateCentroid(history);
    const distanceFromCenter = this.haversineDistance(
      latitude,
      longitude,
      center.latitude,
      center.longitude
    );

    // Simple distance-based outlier detection
    const isAnomaly = distanceFromCenter > radiusKm;
    const score = Math.min(distanceFromCenter / (radiusKm * 2), 1.0); // Normalize score

    let severity = Severity.LOW;
    if (distanceFromCenter > radiusKm * 5) severity = Severity.CRITICAL;
    else if (distanceFromCenter > radiusKm * 3) severity = Severity.HIGH;
    else if (isAnomaly) severity = Severity.MEDIUM;

    return this.createResult(context, isAnomaly, score, severity, isAnomaly ? {
      description: `Spatial anomaly: Location is ${distanceFromCenter.toFixed(2)}km from historical center (limit ${radiusKm}km)`,
      contributingFactors: [
        { factor: 'distance_from_center', weight: 1.0, value: distanceFromCenter }
      ]
    } : undefined);
  }

  private calculateCentroid(points: Array<{ latitude: number; longitude: number }>) {
    const latSum = points.reduce((acc, p) => acc + p.latitude, 0);
    const lonSum = points.reduce((acc, p) => acc + p.longitude, 0);
    return {
      latitude: latSum / points.length,
      longitude: lonSum / points.length,
    };
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return this.EARTH_RADIUS_KM * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private createResult(
    context: DetectionContext,
    isAnomaly: boolean,
    score: number,
    severity: Severity,
    explanation?: any
  ): AnomalyResult {
    return {
      isAnomaly,
      score,
      severity,
      type: this.type,
      entityId: context.entityId,
      timestamp: context.timestamp,
      explanation,
    };
  }
}
