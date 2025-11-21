/**
 * Feature Scalers and Normalizers
 */

export class StandardScaler {
  private mean: number[] = [];
  private std: number[] = [];
  private fitted: boolean = false;

  /**
   * Fit scaler to data
   */
  fit(data: number[][]): void {
    const nFeatures = data[0].length;
    this.mean = new Array(nFeatures).fill(0);
    this.std = new Array(nFeatures).fill(0);

    // Calculate means
    for (const sample of data) {
      for (let j = 0; j < nFeatures; j++) {
        this.mean[j] += sample[j];
      }
    }
    this.mean = this.mean.map(m => m / data.length);

    // Calculate standard deviations
    for (const sample of data) {
      for (let j = 0; j < nFeatures; j++) {
        this.std[j] += Math.pow(sample[j] - this.mean[j], 2);
      }
    }
    this.std = this.std.map(s => Math.sqrt(s / data.length));

    this.fitted = true;
  }

  /**
   * Transform data
   */
  transform(data: number[][]): number[][] {
    if (!this.fitted) {
      throw new Error('Scaler must be fitted before transformation');
    }

    return data.map(sample =>
      sample.map((x, j) =>
        this.std[j] > 0 ? (x - this.mean[j]) / this.std[j] : 0
      )
    );
  }

  /**
   * Fit and transform in one step
   */
  fitTransform(data: number[][]): number[][] {
    this.fit(data);
    return this.transform(data);
  }
}

export class MinMaxScaler {
  private min: number[] = [];
  private max: number[] = [];
  private fitted: boolean = false;

  fit(data: number[][]): void {
    const nFeatures = data[0].length;
    this.min = new Array(nFeatures).fill(Infinity);
    this.max = new Array(nFeatures).fill(-Infinity);

    for (const sample of data) {
      for (let j = 0; j < nFeatures; j++) {
        this.min[j] = Math.min(this.min[j], sample[j]);
        this.max[j] = Math.max(this.max[j], sample[j]);
      }
    }

    this.fitted = true;
  }

  transform(data: number[][]): number[][] {
    if (!this.fitted) {
      throw new Error('Scaler must be fitted before transformation');
    }

    return data.map(sample =>
      sample.map((x, j) => {
        const range = this.max[j] - this.min[j];
        return range > 0 ? (x - this.min[j]) / range : 0;
      })
    );
  }

  fitTransform(data: number[][]): number[][] {
    this.fit(data);
    return this.transform(data);
  }
}
