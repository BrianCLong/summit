/**
 * Synthetic Data Generation with Differential Privacy
 * Generate privacy-preserving synthetic datasets
 */

export class SyntheticDataGenerator {
  /**
   * Generate synthetic data using DP statistics
   */
  generateSynthetic(
    data: number[][],
    epsilon: number,
    numSamples: number
  ): number[][] {
    const dims = data[0].length;

    // Compute DP statistics
    const means = this.computeDPMeans(data, epsilon / 2);
    const stds = this.computeDPStdDevs(data, means, epsilon / 2);

    // Generate synthetic samples
    const synthetic: number[][] = [];

    for (let i = 0; i < numSamples; i++) {
      const sample: number[] = [];

      for (let j = 0; j < dims; j++) {
        sample.push(this.sampleGaussian(means[j], stds[j]));
      }

      synthetic.push(sample);
    }

    return synthetic;
  }

  /**
   * Compute DP means
   */
  private computeDPMeans(data: number[][], epsilon: number): number[] {
    const dims = data[0].length;
    const means: number[] = [];
    const sensitivity = 1 / data.length;

    for (let i = 0; i < dims; i++) {
      const sum = data.reduce((acc, row) => acc + row[i], 0);
      const mean = sum / data.length;
      const noise = this.laplacianNoise(sensitivity / epsilon);
      means.push(mean + noise);
    }

    return means;
  }

  /**
   * Compute DP standard deviations
   */
  private computeDPStdDevs(
    data: number[][],
    means: number[],
    epsilon: number
  ): number[] {
    const dims = data[0].length;
    const stds: number[] = [];

    for (let i = 0; i < dims; i++) {
      const variance =
        data.reduce((acc, row) => acc + Math.pow(row[i] - means[i], 2), 0) /
        data.length;
      const std = Math.sqrt(variance);
      const noise = this.laplacianNoise(1 / (epsilon * data.length));
      stds.push(Math.max(0.1, std + noise));
    }

    return stds;
  }

  private sampleGaussian(mean: number, stddev: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return mean + stddev * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  private laplacianNoise(scale: number): number {
    const u = Math.random() - 0.5;
    return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }
}
