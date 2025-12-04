import { v4 as uuidv4 } from 'uuid';

export type DriverTrend = 'increasing' | 'decreasing' | 'stable';

export interface ZoneBounds {
  dimensions: Record<string, [number, number]>;
  center: Record<string, number>;
  extent: Record<string, number>;
}

export interface UncertaintyDriver {
  factor: string;
  contribution: number;
  trend: DriverTrend;
  source: string;
  description?: string;
}

export interface TurbulentZoneData {
  id?: string;
  fieldId: string;
  bounds: ZoneBounds;
  intensity: number;
  volume: number;
  persistence: number;
  drivers: UncertaintyDriver[];
  markedBy?: string;
  markedAt?: Date;
  notes?: string;
}

export class TurbulentZone {
  id: string;
  fieldId: string;
  bounds: ZoneBounds;
  intensity: number;
  volume: number;
  persistence: number;
  drivers: UncertaintyDriver[];
  markedBy?: string;
  markedAt?: Date;
  notes?: string;

  constructor(data: TurbulentZoneData) {
    this.id = data.id || uuidv4();
    this.fieldId = data.fieldId;
    this.bounds = data.bounds;
    this.intensity = data.intensity;
    this.volume = data.volume;
    this.persistence = data.persistence;
    this.drivers = data.drivers;
    this.markedBy = data.markedBy;
    this.markedAt = data.markedAt;
    this.notes = data.notes;
  }

  /**
   * Check if point is within zone bounds
   */
  containsPoint(coordinates: Record<string, number>): boolean {
    return Object.entries(this.bounds.dimensions).every(([dimension, [min, max]]) => {
      const value = coordinates[dimension];
      return value !== undefined && value >= min && value <= max;
    });
  }

  /**
   * Calculate distance from point to zone center
   */
  distanceFromCenter(coordinates: Record<string, number>): number {
    let sumSquares = 0;

    for (const [dimension, centerValue] of Object.entries(this.bounds.center)) {
      const pointValue = coordinates[dimension];
      if (pointValue !== undefined) {
        sumSquares += Math.pow(pointValue - centerValue, 2);
      }
    }

    return Math.sqrt(sumSquares);
  }

  /**
   * Get primary (highest contribution) driver
   */
  getPrimaryDriver(): UncertaintyDriver | undefined {
    return this.drivers.reduce((max, driver) =>
      driver.contribution > (max?.contribution || 0) ? driver : max
    , undefined as UncertaintyDriver | undefined);
  }

  /**
   * Get drivers by trend
   */
  getDriversByTrend(trend: DriverTrend): UncertaintyDriver[] {
    return this.drivers.filter(d => d.trend === trend);
  }

  /**
   * Calculate total contribution of all drivers
   */
  getTotalContribution(): number {
    return this.drivers.reduce((sum, d) => sum + d.contribution, 0);
  }

  /**
   * Get severity level based on intensity and volume
   */
  getSeverity(): 'low' | 'medium' | 'high' | 'critical' {
    const score = this.intensity * Math.log(this.volume + 1);

    if (score > 5) return 'critical';
    if (score > 3) return 'high';
    if (score > 1) return 'medium';
    return 'low';
  }

  /**
   * Check if zone is expanding
   */
  isExpanding(): boolean {
    const increasingDrivers = this.getDriversByTrend('increasing');
    const totalIncrease = increasingDrivers.reduce((sum, d) => sum + d.contribution, 0);
    return totalIncrease > 0.5; // More than 50% contribution from increasing drivers
  }

  /**
   * Check if zone is stable
   */
  isStable(): boolean {
    return this.persistence > 0.8; // High persistence indicates stability
  }

  /**
   * Merge with another zone
   */
  mergeWith(other: TurbulentZone): TurbulentZone {
    // Calculate merged bounds
    const mergedBounds: ZoneBounds = {
      dimensions: {},
      center: {},
      extent: {},
    };

    for (const dimension of Object.keys(this.bounds.dimensions)) {
      const [min1, max1] = this.bounds.dimensions[dimension];
      const [min2, max2] = other.bounds.dimensions[dimension] || [min1, max1];

      const newMin = Math.min(min1, min2);
      const newMax = Math.max(max1, max2);

      mergedBounds.dimensions[dimension] = [newMin, newMax];
      mergedBounds.center[dimension] = (newMin + newMax) / 2;
      mergedBounds.extent[dimension] = newMax - newMin;
    }

    // Merge drivers
    const driverMap = new Map<string, UncertaintyDriver>();

    for (const driver of [...this.drivers, ...other.drivers]) {
      const existing = driverMap.get(driver.factor);
      if (existing) {
        existing.contribution = Math.max(existing.contribution, driver.contribution);
      } else {
        driverMap.set(driver.factor, { ...driver });
      }
    }

    return new TurbulentZone({
      fieldId: this.fieldId,
      bounds: mergedBounds,
      intensity: Math.max(this.intensity, other.intensity),
      volume: this.volume + other.volume,
      persistence: (this.persistence + other.persistence) / 2,
      drivers: Array.from(driverMap.values()),
    });
  }

  /**
   * Serialize to JSON
   */
  toJSON() {
    return {
      id: this.id,
      fieldId: this.fieldId,
      bounds: this.bounds,
      intensity: this.intensity,
      volume: this.volume,
      persistence: this.persistence,
      drivers: this.drivers,
      markedBy: this.markedBy,
      markedAt: this.markedAt?.toISOString(),
      notes: this.notes,
    };
  }

  /**
   * Create from JSON
   */
  static fromJSON(json: any): TurbulentZone {
    return new TurbulentZone({
      ...json,
      markedAt: json.markedAt ? new Date(json.markedAt) : undefined,
    });
  }
}
