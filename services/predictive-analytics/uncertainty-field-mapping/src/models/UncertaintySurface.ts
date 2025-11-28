import { v4 as uuidv4 } from 'uuid';

export interface Coordinate {
  x: number;
  y: number;
}

export interface SurfaceGrid {
  xDimension: string;
  yDimension: string;
  xResolution: number;
  yResolution: number;
  values: number[][];
}

export interface ContourLevel {
  value: number;
  path: Coordinate[];
  enclosed: boolean;
}

export interface GradientVector {
  position: Coordinate;
  magnitude: number;
  direction: number[];
}

export interface SurfacePeak {
  position: Coordinate;
  height: number;
  prominence: number;
  surrounding: Coordinate[];
}

export interface UncertaintySurfaceData {
  id?: string;
  fieldId: string;
  dimensions: [string, string] | [string, string, string];
  grid: SurfaceGrid;
  contours?: ContourLevel[];
  gradients?: GradientVector[];
  peaks?: SurfacePeak[];
}

export class UncertaintySurface {
  id: string;
  fieldId: string;
  dimensions: [string, string] | [string, string, string];
  grid: SurfaceGrid;
  contours: ContourLevel[];
  gradients: GradientVector[];
  peaks: SurfacePeak[];

  constructor(data: UncertaintySurfaceData) {
    this.id = data.id || uuidv4();
    this.fieldId = data.fieldId;
    this.dimensions = data.dimensions;
    this.grid = data.grid;
    this.contours = data.contours || [];
    this.gradients = data.gradients || [];
    this.peaks = data.peaks || [];
  }

  /**
   * Get value at specific grid coordinates
   */
  getValueAt(x: number, y: number): number | undefined {
    if (x < 0 || x >= this.grid.xResolution || y < 0 || y >= this.grid.yResolution) {
      return undefined;
    }
    return this.grid.values[y][x];
  }

  /**
   * Get bilinear interpolated value at continuous coordinates
   */
  getInterpolatedValue(x: number, y: number): number {
    const x0 = Math.floor(x);
    const x1 = Math.ceil(x);
    const y0 = Math.floor(y);
    const y1 = Math.ceil(y);

    const fx = x - x0;
    const fy = y - y0;

    const v00 = this.getValueAt(x0, y0) || 0;
    const v10 = this.getValueAt(x1, y0) || 0;
    const v01 = this.getValueAt(x0, y1) || 0;
    const v11 = this.getValueAt(x1, y1) || 0;

    const v0 = v00 * (1 - fx) + v10 * fx;
    const v1 = v01 * (1 - fx) + v11 * fx;

    return v0 * (1 - fy) + v1 * fy;
  }

  /**
   * Calculate gradient at grid point
   */
  calculateGradientAt(x: number, y: number): GradientVector | undefined {
    const val = this.getValueAt(x, y);
    if (val === undefined) return undefined;

    // Central difference
    const dx = (this.getValueAt(x + 1, y) || val) - (this.getValueAt(x - 1, y) || val);
    const dy = (this.getValueAt(x, y + 1) || val) - (this.getValueAt(x, y - 1) || val);

    const magnitude = Math.sqrt(dx * dx + dy * dy);
    const direction = [dx / magnitude || 0, dy / dy || 0];

    return {
      position: { x, y },
      magnitude,
      direction,
    };
  }

  /**
   * Find local maxima (peaks)
   */
  findPeaks(minProminence: number = 0.1): SurfacePeak[] {
    const peaks: SurfacePeak[] = [];

    for (let y = 1; y < this.grid.yResolution - 1; y++) {
      for (let x = 1; x < this.grid.xResolution - 1; x++) {
        const center = this.getValueAt(x, y)!;

        // Check if local maximum
        const neighbors = [
          this.getValueAt(x - 1, y - 1)!,
          this.getValueAt(x, y - 1)!,
          this.getValueAt(x + 1, y - 1)!,
          this.getValueAt(x - 1, y)!,
          this.getValueAt(x + 1, y)!,
          this.getValueAt(x - 1, y + 1)!,
          this.getValueAt(x, y + 1)!,
          this.getValueAt(x + 1, y + 1)!,
        ];

        const isMax = neighbors.every(n => center >= n);

        if (isMax) {
          const minNeighbor = Math.min(...neighbors);
          const prominence = center - minNeighbor;

          if (prominence >= minProminence) {
            peaks.push({
              position: { x, y },
              height: center,
              prominence,
              surrounding: [
                { x: x - 1, y: y - 1 },
                { x, y: y - 1 },
                { x: x + 1, y: y - 1 },
                { x: x - 1, y },
                { x: x + 1, y },
                { x: x - 1, y: y + 1 },
                { x, y: y + 1 },
                { x: x + 1, y: y + 1 },
              ],
            });
          }
        }
      }
    }

    return peaks;
  }

  /**
   * Get contour at specific level
   */
  getContour(level: number): ContourLevel | undefined {
    return this.contours.find(c => Math.abs(c.value - level) < 0.001);
  }

  /**
   * Calculate surface statistics
   */
  getStatistics(): {
    mean: number;
    std: number;
    min: number;
    max: number;
    median: number;
  } {
    const allValues = this.grid.values.flat();
    const sorted = [...allValues].sort((a, b) => a - b);

    const mean = allValues.reduce((sum, v) => sum + v, 0) / allValues.length;
    const variance = allValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / allValues.length;

    return {
      mean,
      std: Math.sqrt(variance),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: sorted[Math.floor(sorted.length / 2)],
    };
  }

  /**
   * Serialize to JSON
   */
  toJSON() {
    return {
      id: this.id,
      fieldId: this.fieldId,
      dimensions: this.dimensions,
      grid: this.grid,
      contours: this.contours,
      gradients: this.gradients,
      peaks: this.peaks,
    };
  }

  /**
   * Create from JSON
   */
  static fromJSON(json: any): UncertaintySurface {
    return new UncertaintySurface(json);
  }
}
