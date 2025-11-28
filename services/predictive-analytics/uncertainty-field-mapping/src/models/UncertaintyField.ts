import { v4 as uuidv4 } from 'uuid';

export type DimensionType = 'temporal' | 'spatial' | 'categorical' | 'continuous';
export type PointSource = 'measured' | 'interpolated' | 'extrapolated';

export interface DimensionRange {
  min?: number;
  max?: number;
  categories?: string[];
}

export interface FieldDimension {
  name: string;
  type: DimensionType;
  range: DimensionRange;
  unit?: string;
}

export interface FieldPoint {
  coordinates: Record<string, number>;
  uncertainty: number;
  source: PointSource;
  confidence: number;
  contributors: string[];
}

export interface FieldResolution {
  gridSize: number;
  adaptiveRefinement: boolean;
  minPointDensity: number;
}

export interface FieldMetadata {
  totalPoints: number;
  measuredPoints: number;
  interpolatedPoints: number;
  extrapolatedPoints: number;
  averageUncertainty: number;
  maxUncertainty: number;
  minUncertainty: number;
  generationTimeMs: number;
}

export interface UncertaintyFieldData {
  id?: string;
  investigationId: string;
  dimensions: FieldDimension[];
  points: FieldPoint[];
  resolution: FieldResolution;
  generatedAt?: Date;
  metadata?: FieldMetadata;
}

export class UncertaintyField {
  id: string;
  investigationId: string;
  dimensions: FieldDimension[];
  points: FieldPoint[];
  resolution: FieldResolution;
  generatedAt: Date;
  metadata: FieldMetadata;

  constructor(data: UncertaintyFieldData) {
    this.id = data.id || uuidv4();
    this.investigationId = data.investigationId;
    this.dimensions = data.dimensions;
    this.points = data.points;
    this.resolution = data.resolution;
    this.generatedAt = data.generatedAt || new Date();
    this.metadata = data.metadata || this.calculateMetadata();
  }

  private calculateMetadata(): FieldMetadata {
    const measuredPoints = this.points.filter(p => p.source === 'measured').length;
    const interpolatedPoints = this.points.filter(p => p.source === 'interpolated').length;
    const extrapolatedPoints = this.points.filter(p => p.source === 'extrapolated').length;

    const uncertainties = this.points.map(p => p.uncertainty);
    const averageUncertainty = uncertainties.reduce((sum, u) => sum + u, 0) / uncertainties.length;
    const maxUncertainty = Math.max(...uncertainties);
    const minUncertainty = Math.min(...uncertainties);

    return {
      totalPoints: this.points.length,
      measuredPoints,
      interpolatedPoints,
      extrapolatedPoints,
      averageUncertainty,
      maxUncertainty,
      minUncertainty,
      generationTimeMs: 0, // Set by generator
    };
  }

  /**
   * Get points within specified bounds
   */
  getPointsInBounds(bounds: Record<string, [number, number]>): FieldPoint[] {
    return this.points.filter(point => {
      return Object.entries(bounds).every(([dimension, [min, max]]) => {
        const value = point.coordinates[dimension];
        return value >= min && value <= max;
      });
    });
  }

  /**
   * Get dimension by name
   */
  getDimension(name: string): FieldDimension | undefined {
    return this.dimensions.find(d => d.name === name);
  }

  /**
   * Check if field has temporal dimension
   */
  hasTemporal(): boolean {
    return this.dimensions.some(d => d.type === 'temporal');
  }

  /**
   * Get temporal dimension if exists
   */
  getTemporalDimension(): FieldDimension | undefined {
    return this.dimensions.find(d => d.type === 'temporal');
  }

  /**
   * Calculate uncertainty statistics for specific dimension values
   */
  getUncertaintyStats(dimension: string, value: number, tolerance: number = 0.01): {
    mean: number;
    std: number;
    min: number;
    max: number;
    count: number;
  } {
    const relevantPoints = this.points.filter(p => {
      const coord = p.coordinates[dimension];
      return Math.abs(coord - value) <= tolerance;
    });

    if (relevantPoints.length === 0) {
      return { mean: 0, std: 0, min: 0, max: 0, count: 0 };
    }

    const uncertainties = relevantPoints.map(p => p.uncertainty);
    const mean = uncertainties.reduce((sum, u) => sum + u, 0) / uncertainties.length;
    const variance = uncertainties.reduce((sum, u) => sum + Math.pow(u - mean, 2), 0) / uncertainties.length;
    const std = Math.sqrt(variance);

    return {
      mean,
      std,
      min: Math.min(...uncertainties),
      max: Math.max(...uncertainties),
      count: relevantPoints.length,
    };
  }

  /**
   * Serialize to JSON
   */
  toJSON() {
    return {
      id: this.id,
      investigationId: this.investigationId,
      dimensions: this.dimensions,
      points: this.points,
      resolution: this.resolution,
      generatedAt: this.generatedAt.toISOString(),
      metadata: this.metadata,
    };
  }

  /**
   * Create from JSON
   */
  static fromJSON(json: any): UncertaintyField {
    return new UncertaintyField({
      ...json,
      generatedAt: new Date(json.generatedAt),
    });
  }
}
